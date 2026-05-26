"""Multi-tenant + new feature tests for VIQSO Voter CRM (iteration 2)."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voter-hub-8.preview.emergentagent.com").rstrip("/")
DEFAULT_ACCESS_KEY = "VIQSO-2026"
SUPER_ADMIN_KEY = "VIQSO-MASTER-2026-XKL9PQR4"


# ---------- AUTH (new 3-factor) ----------
class TestAuthV2:
    def test_login_missing_access_key_returns_422(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "admin@crm.com", "password": "admin123"})
        assert r.status_code == 422

    def test_login_wrong_access_key_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "access_key": "WRONG-KEY-XYZ",
            "email": "admin@crm.com", "password": "admin123"})
        assert r.status_code == 401

    def test_login_correct_3factor_returns_token_and_org(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "access_key": DEFAULT_ACCESS_KEY,
            "email": "admin@crm.com", "password": "admin123"})
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d
        assert "org" in d
        assert d["org"]["name"]
        assert d["user"]["org_id"]
        assert d["user"]["role"] == "admin"

    def test_me_returns_org_id_and_org_name(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d.get("org_id")
        assert d.get("org_name")


# ---------- BRUTE FORCE LOCKOUT ----------
class TestBruteForceLockout:
    def test_5_fails_triggers_429(self):
        # Note: lockout identifier is `{client_ip}:{email}`. Behind a load-balanced
        # ingress, source IPs can vary across requests. Send many attempts to
        # increase the chance of >=5 hits from the same proxy IP.
        bad_email = f"bruteforce_{uuid.uuid4().hex[:6]}@crm.com"
        codes = []
        for _ in range(15):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "access_key": DEFAULT_ACCESS_KEY,
                "email": bad_email, "password": "wrongpass"})
            codes.append(r.status_code)
        assert 429 in codes, (
            f"Expected 429 (brute-force lockout) within 15 attempts, got {codes}. "
            f"This likely indicates the lockout identifier (client.host) varies "
            f"across requests behind the K8s proxy, making the lockout ineffective.")


# ---------- SUPER ADMIN AUTH ----------
class TestSuperAdminAuth:
    def test_orgs_get_without_key_403(self):
        r = requests.get(f"{BASE_URL}/api/orgs")
        assert r.status_code == 403

    def test_orgs_get_with_wrong_key_403(self):
        r = requests.get(f"{BASE_URL}/api/orgs",
                         headers={"X-Super-Admin-Key": "BADKEY"})
        assert r.status_code == 403

    def test_orgs_get_with_correct_key_200(self, super_admin_headers):
        r = requests.get(f"{BASE_URL}/api/orgs", headers=super_admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- MULTI-TENANT ISOLATION ----------
@pytest.fixture(scope="module")
def second_org(super_admin_headers):
    """Create a second org for isolation tests."""
    slug = uuid.uuid4().hex[:6].upper()
    ak = f"TESTORG-{slug}"
    admin_email = f"TEST_admin_{slug}@crm.com"
    admin_pw = "secondorg123"
    r = requests.post(f"{BASE_URL}/api/orgs",
                      headers=super_admin_headers,
                      json={"name": f"TEST_Org_{slug}",
                            "party_name": "Test Party",
                            "access_key": ak,
                            "admin_email": admin_email,
                            "admin_password": admin_pw,
                            "admin_name": "Second Org Admin"})
    assert r.status_code == 200, r.text
    data = r.json()
    org_id = data["org"]["id"]

    # Login as the new org's admin
    lr = requests.post(f"{BASE_URL}/api/auth/login", json={
        "access_key": ak, "email": admin_email, "password": admin_pw})
    assert lr.status_code == 200, lr.text
    token = lr.json()["access_token"]
    yield {"id": org_id, "access_key": ak, "token": token,
           "admin_email": admin_email, "admin_pw": admin_pw}

    # Cleanup: soft-disable org
    requests.delete(f"{BASE_URL}/api/orgs/{org_id}", headers=super_admin_headers)


class TestMultiTenantIsolation:
    def test_new_org_admin_cannot_see_default_org_booths(self, second_org):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {second_org['token']}"})
        r = s.get(f"{BASE_URL}/api/booths")
        assert r.status_code == 200
        booths = r.json()
        # New org has no booths yet
        assert booths == [], f"Expected empty, got {len(booths)} booths"

    def test_new_org_admin_cannot_see_default_org_voters(self, second_org):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {second_org['token']}"})
        r = s.get(f"{BASE_URL}/api/voters")
        assert r.status_code == 200
        assert r.json() == []

    def test_new_org_admin_sees_only_own_users(self, second_org):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {second_org['token']}"})
        r = s.get(f"{BASE_URL}/api/users")
        assert r.status_code == 200
        users = r.json()
        # Only the admin user should exist
        assert len(users) == 1
        assert users[0]["email"] == second_org["admin_email"].lower()

    def test_new_org_visits_isolated(self, second_org):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {second_org['token']}"})
        r = s.get(f"{BASE_URL}/api/visits")
        assert r.status_code == 200
        assert r.json() == []

    def test_new_org_analytics_overview_isolated(self, second_org):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {second_org['token']}"})
        r = s.get(f"{BASE_URL}/api/analytics/overview")
        assert r.status_code == 200
        d = r.json()
        assert d["total_voters"] == 0
        assert d["total_booths"] == 0

    def test_settings_per_org_isolated(self, admin_client, second_org):
        # Update default org settings
        r1 = admin_client.put(f"{BASE_URL}/api/settings",
                              json={"party_name": "VIQSO Updated"})
        assert r1.status_code == 200
        # New org settings should NOT have this value
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {second_org['token']}"})
        r2 = s.get(f"{BASE_URL}/api/settings")
        assert r2.status_code == 200
        assert r2.json().get("party_name") != "VIQSO Updated"


# ---------- WORKER BOOTH-SCOPE WRITE ENFORCEMENT ----------
class TestWorkerBoothScopeWrites:
    def test_worker_create_voter_on_unassigned_booth_403(self, worker_client, admin_client):
        # Get all booths from admin
        all_booths = admin_client.get(f"{BASE_URL}/api/booths").json()
        worker_booths = worker_client.get(f"{BASE_URL}/api/booths").json()
        worker_booth_ids = {b["id"] for b in worker_booths}
        unassigned = [b for b in all_booths if b["id"] not in worker_booth_ids]
        if not unassigned:
            pytest.skip("Worker is assigned to all booths")
        target = unassigned[0]
        r = worker_client.post(f"{BASE_URL}/api/voters", json={
            "booth_id": target["id"], "name": "TEST_UnassignedVoter",
            "age": 30, "gender": "male"})
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_worker_create_voter_on_assigned_booth_200(self, worker_client):
        booths = worker_client.get(f"{BASE_URL}/api/booths").json()
        assert booths, "Worker has no assigned booths"
        r = worker_client.post(f"{BASE_URL}/api/voters", json={
            "booth_id": booths[0]["id"], "name": "TEST_AssignedVoter",
            "age": 30, "gender": "male"})
        assert r.status_code == 200, r.text
        vid = r.json()["id"]
        # cleanup
        worker_client.delete(f"{BASE_URL}/api/voters/{vid}")  # may 403; ok

    def test_worker_patch_voter_in_unassigned_booth_403(self, worker_client, admin_client):
        all_booths = admin_client.get(f"{BASE_URL}/api/booths").json()
        worker_booths = worker_client.get(f"{BASE_URL}/api/booths").json()
        worker_booth_ids = {b["id"] for b in worker_booths}
        unassigned = [b for b in all_booths if b["id"] not in worker_booth_ids]
        if not unassigned:
            pytest.skip("No unassigned booths")
        # Create voter in unassigned booth via admin
        rc = admin_client.post(f"{BASE_URL}/api/voters", json={
            "booth_id": unassigned[0]["id"], "name": "TEST_UnassignedTarget",
            "age": 30, "gender": "male"})
        assert rc.status_code == 200
        vid = rc.json()["id"]
        try:
            r = worker_client.patch(f"{BASE_URL}/api/voters/{vid}",
                                    json={"sentiment": "positive"})
            assert r.status_code in (403, 404), f"Expected 403/404, got {r.status_code}"
        finally:
            admin_client.delete(f"{BASE_URL}/api/voters/{vid}")


# ---------- IMPORT ENDPOINTS ----------
class TestImport:
    def test_template_endpoint(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/import/template")
        assert r.status_code == 200

    def test_import_voters_tags_with_org(self, admin_client):
        # Import endpoint requires Excel (.xlsx) file
        try:
            from openpyxl import Workbook
        except ImportError:
            pytest.skip("openpyxl not available")
        from io import BytesIO
        booths = admin_client.get(f"{BASE_URL}/api/booths").json()
        if not booths:
            pytest.skip("No booths")
        wb = Workbook()
        ws = wb.active
        ws.append(["name", "booth_number", "age", "gender", "political_preference"])
        ws.append([f"TEST_Import_{uuid.uuid4().hex[:6]}",
                   booths[0]["booth_number"], 40, "male", "supporter"])
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        files = {"file": ("voters.xlsx", buf.read(),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        headers = {"Authorization": admin_client.headers["Authorization"]}
        r = requests.post(f"{BASE_URL}/api/import/voters", headers=headers, files=files)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("inserted", 0) >= 1 or body.get("updated", 0) >= 1


# ---------- SEGREGATION & FAMILIES ----------
class TestSegregationFamilies:
    @pytest.mark.parametrize("group_by", ["caste", "religion", "age_group", "occupation"])
    def test_segregation(self, admin_client, group_by):
        r = admin_client.get(f"{BASE_URL}/api/segregation/{group_by}")
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_families(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/families")
        assert r.status_code == 200
        data = r.json()
        # Accept either list or {families: [...]} shape
        if isinstance(data, dict):
            assert "families" in data
            assert isinstance(data["families"], list)
        else:
            assert isinstance(data, list)


# ---------- PWA MANIFEST ----------
class TestPWA:
    def test_manifest_accessible(self):
        # manifest served by frontend, but we test via REACT_APP_BACKEND_URL only for backend
        # manifest is on frontend domain
        frontend_url = BASE_URL  # same domain
        r = requests.get(f"{frontend_url}/manifest.json", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "name" in d
        assert "VIQSO" in (d.get("name", "") + d.get("short_name", ""))
