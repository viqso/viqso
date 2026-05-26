"""Iter-3 backend tests: AAP sample org, voter slip, image upload, candidate profile."""
import io
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://voter-hub-8.preview.emergentagent.com").rstrip("/")
AAP_KEY = "AAP-MUM-W20-2026"
VIQSO_KEY = "VIQSO-2026"


def _login(email, password, access_key):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password, "access_key": access_key},
        timeout=20,
    )
    return r


def _client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ---------- AAP login ----------
class TestAAPLogin:
    def test_aap_admin_login(self):
        r = _login("abhishek@aap.org", "abhishek123", AAP_KEY)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "abhishek@aap.org"
        assert "Abhishek Dubey" in data["org"]["name"]
        assert "Ward 20" in data["org"]["name"]

    def test_aap_agent_login(self):
        r = _login("priya@aap.org", "agent123", AAP_KEY)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] in ("worker", "agent", "booth-agent", "supervisor")
        # role used internally — worker scope applies
        assert data["user"]["email"] == "priya@aap.org"

    def test_aap_admin_wrong_key_fails(self):
        r = _login("abhishek@aap.org", "abhishek123", VIQSO_KEY)
        assert r.status_code in (401, 403), r.text


# ---------- Cross-org isolation ----------
class TestCrossOrgIsolation:
    @pytest.fixture(scope="class")
    def aap_admin(self):
        r = _login("abhishek@aap.org", "abhishek123", AAP_KEY)
        assert r.status_code == 200
        return _client(r.json()["access_token"])

    @pytest.fixture(scope="class")
    def viqso_admin(self):
        r = _login("admin@crm.com", "admin123", VIQSO_KEY)
        assert r.status_code == 200
        return _client(r.json()["access_token"])

    def test_aap_voters_count(self, aap_admin):
        r = aap_admin.get(f"{BASE_URL}/api/voters?limit=500")
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("voters", body.get("items", []))
        assert len(items) == 45, f"expected 45 AAP voters, got {len(items)}"

    def test_viqso_voters_count(self, viqso_admin):
        r = viqso_admin.get(f"{BASE_URL}/api/voters?limit=500")
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("voters", body.get("items", []))
        assert len(items) == 120, f"expected 120 VIQSO voters, got {len(items)}"

    def test_aap_booths_isolated(self, aap_admin):
        r = aap_admin.get(f"{BASE_URL}/api/booths")
        assert r.status_code == 200
        booths = r.json()
        assert isinstance(booths, list)
        assert len(booths) == 5, f"expected 5 AAP booths got {len(booths)}"


# ---------- Voter Slip ----------
class TestVoterSlip:
    @pytest.fixture(scope="class")
    def aap_admin(self):
        r = _login("abhishek@aap.org", "abhishek123", AAP_KEY)
        return _client(r.json()["access_token"])

    @pytest.fixture(scope="class")
    def aap_agent(self):
        r = _login("priya@aap.org", "agent123", AAP_KEY)
        return _client(r.json()["access_token"])

    @pytest.fixture(scope="class")
    def aap_voter_id(self, aap_admin):
        r = aap_admin.get(f"{BASE_URL}/api/voters?limit=5")
        body = r.json()
        items = body if isinstance(body, list) else body.get("voters", body.get("items", []))
        return items[0]["id"]

    def test_slip_data_shape(self, aap_admin, aap_voter_id):
        r = aap_admin.get(f"{BASE_URL}/api/voters/{aap_voter_id}/slip-data")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("voter", "booth", "org", "settings"):
            assert k in data, f"missing key {k}"
        assert data["voter"]["id"] == aap_voter_id
        # candidate fields populated for AAP
        s = data["settings"]
        assert s.get("candidate_name") == "Abhishek Dubey"
        assert s.get("candidate_photo_url"), "candidate_photo_url empty"
        assert "Corporator" in (s.get("candidate_position") or "")

    def test_worker_scope_blocked_for_unassigned_booth(self, aap_admin, aap_agent):
        # find a voter in a booth NOT assigned to priya
        me = aap_agent.get(f"{BASE_URL}/api/auth/me").json()
        assigned = set(me.get("assigned_booth_ids") or me.get("booth_ids") or [])
        r = aap_admin.get(f"{BASE_URL}/api/voters?limit=500").json()
        items = r if isinstance(r, list) else r.get("voters", r.get("items", []))
        target = next((v for v in items if v.get("booth_id") and v["booth_id"] not in assigned), None)
        if not target:
            pytest.skip("no unassigned-booth voter found")
        rr = aap_agent.get(f"{BASE_URL}/api/voters/{target['id']}/slip-data")
        assert rr.status_code == 403, f"expected 403 got {rr.status_code}: {rr.text}"


# ---------- Image upload ----------
class TestImageUpload:
    @pytest.fixture(scope="class")
    def aap_admin_token(self):
        return _login("abhishek@aap.org", "abhishek123", AAP_KEY).json()["access_token"]

    @pytest.fixture(scope="class")
    def viqso_worker_token(self):
        return _login("worker@crm.com", "worker123", VIQSO_KEY).json()["access_token"]

    def _png_bytes(self):
        # 1x1 PNG
        import base64
        return base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ZitRk0AAAAASUVORK5CYII="
        )

    def test_upload_png_ok(self, aap_admin_token):
        r = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {aap_admin_token}"},
            files={"file": ("a.png", self._png_bytes(), "image/png")},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["url"].startswith("data:image/png;base64,")

    def test_upload_non_image_400(self, aap_admin_token):
        r = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {aap_admin_token}"},
            files={"file": ("t.txt", b"hello", "text/plain")},
            timeout=20,
        )
        assert r.status_code == 400, r.text

    def test_upload_too_large_400(self, aap_admin_token):
        big = b"\x89PNG\r\n\x1a\n" + b"0" * (2 * 1024 * 1024 + 10)
        r = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {aap_admin_token}"},
            files={"file": ("big.png", big, "image/png")},
            timeout=30,
        )
        assert r.status_code == 400, r.text

    def test_upload_worker_forbidden(self, viqso_worker_token):
        r = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {viqso_worker_token}"},
            files={"file": ("a.png", self._png_bytes(), "image/png")},
            timeout=20,
        )
        assert r.status_code == 403, r.text


# ---------- Settings per-org isolation ----------
class TestSettingsIsolation:
    def test_settings_put_isolated(self):
        aap = _client(_login("abhishek@aap.org", "abhishek123", AAP_KEY).json()["access_token"])
        viqso = _client(_login("admin@crm.com", "admin123", VIQSO_KEY).json()["access_token"])

        # baseline VIQSO
        v_before = viqso.get(f"{BASE_URL}/api/settings").json()
        viqso_candidate_before = v_before.get("candidate_name", "")

        # PUT AAP candidate_bio
        new_bio = "TEST_iter3_bio"
        aap.headers.update({"Content-Type": "application/json"})
        r = aap.put(f"{BASE_URL}/api/settings", json={"candidate_bio": new_bio})
        assert r.status_code == 200, r.text

        a_after = aap.get(f"{BASE_URL}/api/settings").json()
        assert a_after.get("candidate_bio") == new_bio

        v_after = viqso.get(f"{BASE_URL}/api/settings").json()
        assert v_after.get("candidate_name", "") == viqso_candidate_before
        assert v_after.get("candidate_bio") != new_bio, "VIQSO settings polluted by AAP PUT"

        # restore AAP bio
        aap.put(
            f"{BASE_URL}/api/settings",
            json={"candidate_bio": "5 saal se Ward 20 ke vikas ke liye samarpit. Imaandar, jagrook, aapka apna."},
        )
