"""
Iter-7 backend tests — Election Context for White-label APK Builder
Tests:
- GET /api/orgs/{id}/apk-config — returns app_name, icon_url, election_context, election_types
- PATCH /api/orgs/{id}/election-context — super-admin gated, validates election_type
- TWA manifest dynamics — name reflects candidate + election_type label
- Icon priority — party_symbol_url > logo_url
- Manifest _viqso meta block
- ZIP README contains Election Context table
- Auth (401/403) + isolation (404)
"""
import io
import os
import zipfile

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voter-hub-8.preview.emergentagent.com").rstrip("/")
SUPER_ADMIN_KEY = "VIQSO-MASTER-2026-XKL9PQR4"
AAP_ORG_ID = "aap-mumbai-w20-001"

EXPECTED_ETYPES = {"ward", "municipal", "vidhan_sabha", "lok_sabha", "zilla_parishad", "panchayat", "other"}


def _super_headers():
    return {"X-Super-Admin-Key": SUPER_ADMIN_KEY, "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def saved_context():
    """Save AAP's current election context before tests, restore after."""
    r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
    assert r.status_code == 200, f"Failed to load AAP apk-config: {r.text}"
    original = r.json().get("election_context", {})
    yield original
    # Restore — strip nullable/missing fields
    payload = {k: v for k, v in original.items() if v is not None}
    requests.patch(
        f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
        headers=_super_headers(), json=payload, timeout=15,
    )


# ---------- 1. GET apk-config shape ----------

class TestApkConfigShape:
    def test_get_apk_config_returns_top_level_fields(self):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        assert r.status_code == 200
        data = r.json()
        # Top-level enriched fields
        for k in ("app_name", "icon_url", "launcher_name", "package_id", "theme_color", "start_url", "twa_manifest"):
            assert k in data, f"missing top-level key: {k}"
        assert isinstance(data["app_name"], str) and len(data["app_name"]) > 0

    def test_get_apk_config_election_context_object(self):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        ctx = r.json().get("election_context", {})
        expected = {
            "party_name", "party_short_name", "party_logo_url", "party_symbol_url",
            "candidate_name", "candidate_position", "constituency_name",
            "election_scope_name", "election_date", "election_type", "primary_color",
        }
        missing = expected - set(ctx.keys())
        assert not missing, f"election_context missing: {missing}"

    def test_get_apk_config_election_types_array(self):
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        etypes = r.json().get("election_types", [])
        assert isinstance(etypes, list)
        values = {e.get("value") for e in etypes}
        assert values == EXPECTED_ETYPES, f"Got {values}"
        # each entry must have value, label, short
        for et in etypes:
            assert "value" in et and "label" in et and "short" in et


# ---------- 2. Auth gating ----------

class TestAuthGating:
    def test_patch_election_context_no_key_blocked(self):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            json={"candidate_name": "Hacker"}, timeout=15,
        )
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_patch_election_context_wrong_key_blocked(self):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers={"X-Super-Admin-Key": "WRONG-KEY", "Content-Type": "application/json"},
            json={"candidate_name": "Hacker"}, timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_patch_election_context_missing_org_404(self):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/no-such-org-xyz/election-context",
            headers=_super_headers(), json={"candidate_name": "x"}, timeout=15,
        )
        assert r.status_code == 404


# ---------- 3. PATCH validation + persistence ----------

class TestPatchElectionContext:
    def test_invalid_election_type_rejected(self, saved_context):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(), json={"election_type": "totally_made_up"}, timeout=15,
        )
        assert r.status_code == 400
        assert "election_type" in r.text.lower() or "allowed" in r.text.lower()

    def test_patch_persists_and_get_reflects(self, saved_context):
        payload = {
            "election_type": "lok_sabha",
            "candidate_name": "Abhishek Dubey",
            "election_scope_name": "Mumbai South",
            "election_date": "20 Apr 2026",
            "party_symbol_url": "https://example.com/broom.png",
        }
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(), json=payload, timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert isinstance(body.get("updates"), list)

        # Verify GET reflects it
        g = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        ctx = g.json()["election_context"]
        assert ctx["election_type"] == "lok_sabha"
        assert ctx["candidate_name"] == "Abhishek Dubey"
        assert ctx["election_scope_name"] == "Mumbai South"
        assert ctx["election_date"] == "20 Apr 2026"
        assert ctx["party_symbol_url"] == "https://example.com/broom.png"

    def test_each_valid_election_type_accepted(self, saved_context):
        for et in EXPECTED_ETYPES:
            r = requests.patch(
                f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
                headers=_super_headers(), json={"election_type": et}, timeout=15,
            )
            assert r.status_code == 200, f"{et} rejected: {r.text}"


# ---------- 4. TWA manifest dynamics ----------

class TestManifestDynamics:
    def test_lok_sabha_with_candidate_name_format(self, saved_context):
        # Set lok_sabha + candidate
        requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(),
            json={"election_type": "lok_sabha", "candidate_name": "Abhishek Dubey"}, timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        data = r.json()
        assert data["app_name"] == "Abhishek Dubey — Lok Sabha (Parliament)", f"got: {data['app_name']}"
        assert data["launcher_name"] == "Abhishek (MP)", f"got: {data['launcher_name']}"
        assert "?ak=" in data["start_url"] and "et=lok_sabha" in data["start_url"]

    def test_empty_candidate_falls_back_to_party_name(self, saved_context):
        # Blank candidate
        requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(),
            json={"election_type": "lok_sabha", "candidate_name": ""}, timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        data = r.json()
        # Should NOT start with candidate; should use party_name pattern "{Party} — Lok Sabha (Parliament)"
        assert "Lok Sabha (Parliament)" in data["app_name"]
        ctx = data["election_context"]
        if ctx["party_name"]:
            assert data["app_name"].startswith(ctx["party_name"]), f"app_name {data['app_name']} should start with party {ctx['party_name']}"

    def test_icon_priority_symbol_over_logo(self, saved_context):
        sym = "https://example.com/symbol-broom.png"
        logo = "https://example.com/aap-logo.png"
        requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(),
            json={"party_symbol_url": sym, "party_logo_url": logo}, timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        data = r.json()
        assert data["icon_url"] == sym, f"symbol should win, got {data['icon_url']}"
        assert data["twa_manifest"]["iconUrl"] == sym

    def test_icon_falls_back_to_logo_when_symbol_blank(self, saved_context):
        logo = "https://example.com/aap-logo-only.png"
        requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(),
            json={"party_symbol_url": "", "party_logo_url": logo}, timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        data = r.json()
        assert data["icon_url"] == logo, f"got {data['icon_url']}"

    def test_viqso_meta_block_present(self, saved_context):
        requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(),
            json={"election_type": "vidhan_sabha", "election_scope_name": "Andheri West",
                  "candidate_name": "Abhishek Dubey"}, timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-config", headers=_super_headers(), timeout=15)
        meta = r.json()["twa_manifest"].get("_viqso", {})
        for k in ("party_name", "party_short_name", "party_symbol_url", "party_logo_url",
                  "candidate_name", "candidate_photo_url", "constituency", "election_type",
                  "election_label", "election_date", "theme_color"):
            assert k in meta, f"_viqso missing {k}"
        assert meta["election_type"] == "vidhan_sabha"
        # Should be like "Vidhan Sabha (Assembly) · Andheri West"
        assert "Vidhan Sabha (Assembly)" in meta["election_label"]
        assert "Andheri West" in meta["election_label"]


# ---------- 5. ZIP package README ----------

class TestZipReadme:
    def test_zip_readme_has_election_context_table(self, saved_context):
        requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/election-context",
            headers=_super_headers(),
            json={"election_type": "vidhan_sabha", "candidate_name": "Abhishek Dubey",
                  "election_scope_name": "Andheri West", "election_date": "15 Feb 2026"},
            timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-package",
                         headers={"X-Super-Admin-Key": SUPER_ADMIN_KEY}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/zip") or len(r.content) > 100

        with zipfile.ZipFile(io.BytesIO(r.content), "r") as zf:
            names = zf.namelist()
            readme_name = next((n for n in names if n.lower().endswith("readme.md")), None)
            assert readme_name, f"README.md not in zip; got {names}"
            readme = zf.read(readme_name).decode("utf-8")

        # Required Election Context table rows
        for row in ("Election Context", "Party", "Candidate", "Election Type",
                    "Constituency", "Election Date", "Symbol", "Logo",
                    "Theme Color", "App Display Name", "Launcher Name"):
            assert row in readme, f"README missing row '{row}'"
        # Sanity: values reflect current org
        assert "Abhishek Dubey" in readme
        assert "Vidhan Sabha (Assembly)" in readme


# ---------- 6. Regression — iter-5 flows still work ----------

class TestIter5Regression:
    def test_apk_settings_save_still_works(self):
        r = requests.patch(
            f"{BASE_URL}/api/orgs/{AAP_ORG_ID}/apk-settings",
            headers=_super_headers(),
            json={"package_id": "com.viqso.aapmumbai", "signing_fingerprint": ""}, timeout=15,
        )
        assert r.status_code == 200

    def test_public_assetlinks_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/.well-known/assetlinks.json", timeout=15)
        assert r.status_code == 200
        # Should be JSON array
        data = r.json()
        assert isinstance(data, list)
