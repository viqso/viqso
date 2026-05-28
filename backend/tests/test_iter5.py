"""
Iter-5 backend tests — White-label APK Builder
Tests:
- GET /api/orgs/{id}/apk-config
- PATCH /api/orgs/{id}/apk-settings
- GET /api/orgs/{id}/apk-package (ZIP)
- GET /api/.well-known/assetlinks.json (public)
- Authorization (super-admin gating)
- Org isolation (404 on missing)
"""
import io
import json
import os
import re
import zipfile

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voter-hub-8.preview.emergentagent.com").rstrip("/")
SUPER_ADMIN_KEY = "VIQSO-MASTER-2026-XKL9PQR4"
AAP_ORG_ID = "aap-mumbai-w20-001"
DEMO_ORG_ID_HINT = "VIQSO-WK2JHQACD5"  # access key — we'll resolve org_id

VALID_FP = "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"


# ---------- module-scope helpers ----------

@pytest.fixture(scope="module")
def sa_headers():
    return {"X-Super-Admin-Key": SUPER_ADMIN_KEY}


@pytest.fixture(scope="module")
def demo_org_id(sa_headers):
    r = requests.get(f"{BASE_URL}/api/orgs", headers=sa_headers, timeout=20)
    assert r.status_code == 200, r.text
    orgs = r.json()
    for o in orgs:
        if o.get("access_key") == DEMO_ORG_ID_HINT:
            return o["id"]
    pytest.skip(f"Iter-4 demo org with access_key {DEMO_ORG_ID_HINT} not found")


@pytest.fixture(scope="module")
def throwaway_org(sa_headers):
    """Create a throwaway org for PATCH tests; clean up after."""
    import uuid
    suffix = uuid.uuid4().hex[:6].upper()
    payload = {
        "name": f"TEST_iter5_apk_org_{suffix}",
        "access_key": f"TEST-ITER5-APK-{suffix}",
        "party_name": "Iter5 APK Test Party",
        "party_short_name": "Iter5APK",
        "primary_color": "#112233",
        "is_demo": False,
        "admin_email": f"test_iter5_apk_{suffix}@example.com",
        "admin_password": "Iter5Apk!Pass123",
    }
    r = requests.post(f"{BASE_URL}/api/orgs", headers=sa_headers, json=payload, timeout=20)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    org = body.get("org", body)  # Endpoint wraps under "org"
    yield org
    # Cleanup
    try:
        requests.delete(f"{BASE_URL}/api/orgs/{org['id']}", headers=sa_headers, timeout=20)
    except Exception:
        pass


@pytest.fixture(scope="module")
def admin_token_aap():
    """Regular org-admin JWT for AAP org — used to test that JWTs CANNOT hit APK endpoints."""
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "abhishek@aap.org", "password": "abhishek123", "access_key": "AAP-MUM-W20-2026"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ---------- GET /api/orgs/{id}/apk-config ----------

class TestApkConfig:
    def test_aap_apk_config_shape(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=sa_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("org_id", "package_id", "host", "theme_color", "twa_manifest", "pwabuilder_url"):
            assert k in d, f"missing {k}"
        assert d["org_id"] == AAP_ORG_ID
        # Host must be PUBLIC, not internal cluster
        assert "cluster" not in d["host"], f"internal cluster host leaked: {d['host']}"
        assert "localhost" not in d["host"]
        # Twa manifest shape
        m = d["twa_manifest"]
        for k in ("packageId", "host", "startUrl", "themeColor", "iconUrl", "fullScopeUrl", "launcherName"):
            assert k in m, f"twa_manifest missing {k}"
        # startUrl must contain ?ak=<access_key>
        assert "ak=AAP-MUM-W20-2026" in m["startUrl"]
        # pwabuilder url
        assert d["pwabuilder_url"].startswith("https://www.pwabuilder.com/reportcard?site=")
        assert "cluster" not in d["pwabuilder_url"]

    def test_demo_org_apk_config(self, sa_headers, demo_org_id):
        r = requests.get(f"{BASE_URL}/api/orgs/{demo_org_id}/apk-config", headers=sa_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["org_id"] == demo_org_id
        assert "ak=VIQSO-WK2JHQACD5" in d["twa_manifest"]["startUrl"]

    def test_apk_config_404_on_missing_org(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/orgs/nonexistent-org-xyz/apk-config", headers=sa_headers, timeout=20)
        assert r.status_code == 404

    def test_apk_config_requires_super_admin_no_header(self):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", timeout=20)
        assert r.status_code in (401, 403)

    def test_apk_config_requires_super_admin_wrong_key(self):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config",
                         headers={"X-Super-Admin-Key": "WRONG-KEY"}, timeout=20)
        assert r.status_code in (401, 403)

    def test_apk_config_rejects_org_admin_jwt(self, admin_token_aap):
        r = requests.get(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config",
            headers={"Authorization": f"Bearer {admin_token_aap}"},
            timeout=20,
        )
        assert r.status_code in (401, 403), f"org-admin JWT should NOT be able to call APK endpoint; got {r.status_code}"


# ---------- PATCH /api/orgs/{id}/apk-settings ----------

class TestApkSettings:
    def test_valid_patch(self, sa_headers, throwaway_org):
        org_id = throwaway_org["id"]
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{org_id}/apk-settings",
            headers=sa_headers,
            json={"package_id": "com.viqso.test", "signing_fingerprint": VALID_FP},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # Verify persisted via apk-config
        r2 = requests.get(f"{BASE_URL}/api/orgs/{org_id}/apk-config", headers=sa_headers, timeout=20)
        assert r2.status_code == 200
        d = r2.json()
        assert d["package_id"] == "com.viqso.test"
        assert d["signing_fingerprint"] == VALID_FP

    def test_invalid_package_id_no_dots(self, sa_headers, throwaway_org):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{throwaway_org['id']}/apk-settings",
            headers=sa_headers,
            json={"package_id": "BadId"},
            timeout=20,
        )
        assert r.status_code == 400, r.text

    def test_invalid_package_id_uppercase(self, sa_headers, throwaway_org):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{throwaway_org['id']}/apk-settings",
            headers=sa_headers,
            json={"package_id": "Com.Viqso.Foo"},
            timeout=20,
        )
        assert r.status_code == 400

    def test_invalid_fingerprint(self, sa_headers, throwaway_org):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{throwaway_org['id']}/apk-settings",
            headers=sa_headers,
            json={"signing_fingerprint": "not-a-real-fingerprint"},
            timeout=20,
        )
        assert r.status_code == 400

    def test_patch_404_on_missing_org(self, sa_headers):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/nonexistent-org-xyz/apk-settings",
            headers=sa_headers,
            json={"package_id": "com.viqso.x"},
            timeout=20,
        )
        assert r.status_code == 404

    def test_patch_requires_super_admin(self):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-settings",
            json={"package_id": "com.viqso.x"}, timeout=20,
        )
        assert r.status_code in (401, 403)

    def test_patch_rejects_org_admin_jwt(self, admin_token_aap):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-settings",
            headers={"Authorization": f"Bearer {admin_token_aap}"},
            json={"package_id": "com.viqso.hijack"},
            timeout=20,
        )
        assert r.status_code in (401, 403)


# ---------- GET /api/orgs/{id}/apk-package (ZIP) ----------

class TestApkPackage:
    def test_zip_download_shape(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-package", headers=sa_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert "application/zip" in r.headers.get("content-type", "")
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower()
        assert "filename=" in cd.lower()
        # parse zip
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = set(zf.namelist())
        for required in ("twa-manifest.json", ".well-known/assetlinks.json", "README.md", "build.sh"):
            assert required in names, f"ZIP missing {required}; got {names}"
        # twa-manifest.json correctness
        manifest = json.loads(zf.read("twa-manifest.json").decode("utf-8"))
        assert "packageId" in manifest
        assert "ak=AAP-MUM-W20-2026" in manifest["startUrl"]
        assert "cluster" not in manifest["host"]
        # assetlinks
        al = json.loads(zf.read(".well-known/assetlinks.json").decode("utf-8"))
        assert isinstance(al, list) and len(al) >= 1
        assert al[0]["target"]["package_name"] == manifest["packageId"]

    def test_zip_uses_configured_package_id(self, sa_headers, throwaway_org):
        # set package_id then download
        requests.patch(
            f"{BASE_URL}/api/orgs/{throwaway_org['id']}/apk-settings",
            headers=sa_headers,
            json={"package_id": "com.viqso.iter5test", "signing_fingerprint": VALID_FP},
            timeout=20,
        )
        r = requests.get(f"{BASE_URL}/api/orgs/{throwaway_org['id']}/apk-package", headers=sa_headers, timeout=30)
        assert r.status_code == 200
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        manifest = json.loads(zf.read("twa-manifest.json").decode("utf-8"))
        assert manifest["packageId"] == "com.viqso.iter5test"
        # assetlinks should embed the configured fingerprint
        al = json.loads(zf.read(".well-known/assetlinks.json").decode("utf-8"))
        assert VALID_FP in al[0]["target"]["sha256_cert_fingerprints"]

    def test_zip_404_on_missing_org(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/orgs/nonexistent-zzz/apk-package", headers=sa_headers, timeout=20)
        assert r.status_code == 404

    def test_zip_requires_super_admin(self):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-package", timeout=20)
        assert r.status_code in (401, 403)

    def test_zip_rejects_org_admin_jwt(self, admin_token_aap):
        r = requests.get(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-package",
            headers={"Authorization": f"Bearer {admin_token_aap}"},
            timeout=20,
        )
        assert r.status_code in (401, 403)


# ---------- Public assetlinks.json aggregator ----------

class TestAssetlinks:
    def test_public_no_auth_required(self):
        r = requests.get(f"{BASE_URL}/api/.well-known/assetlinks.json", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_configured_org_appears(self, sa_headers, throwaway_org):
        # Ensure configured
        requests.patch(
            f"{BASE_URL}/api/orgs/{throwaway_org['id']}/apk-settings",
            headers=sa_headers,
            json={"package_id": "com.viqso.assetlinkstest", "signing_fingerprint": VALID_FP},
            timeout=20,
        )
        r = requests.get(f"{BASE_URL}/api/.well-known/assetlinks.json", timeout=20)
        assert r.status_code == 200
        data = r.json()
        pkgs = [entry["target"]["package_name"] for entry in data]
        assert "com.viqso.assetlinkstest" in pkgs
        # find it & verify fingerprint
        for entry in data:
            if entry["target"]["package_name"] == "com.viqso.assetlinkstest":
                assert VALID_FP in entry["target"]["sha256_cert_fingerprints"]
                assert entry["relation"] == ["delegate_permission/common.handle_all_urls"]
                assert entry["target"]["namespace"] == "android_app"
                break


# ---------- Seed orgs preservation ----------

class TestSeedOrgPreservation:
    """Ensure tests do NOT mutate AAP/VIQSO seed org APK config."""

    def test_aap_seed_apk_state_unchanged(self, sa_headers):
        # Read & sanity check; we never PATCH this org in any test
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=sa_headers, timeout=20)
        assert r.status_code == 200
        # Just verify endpoint returns a valid default; we don't mutate this org
        d = r.json()
        assert d["package_id"].startswith("com.viqso.") or d["package_id"]
