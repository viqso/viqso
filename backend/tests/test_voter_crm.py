"""Backend tests for VIQSO Voter CRM API"""
import requests
import pytest
import uuid

AK = "VIQSO-2026"

# ---------- AUTH ----------
class TestAuth:
    def test_login_admin_success(self, base_url):
        r = requests.post(f"{base_url}/api/auth/login", json={"access_key": AK, "email": "admin@crm.com", "password": "admin123"})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@crm.com"

    def test_login_supervisor_success(self, base_url):
        r = requests.post(f"{base_url}/api/auth/login", json={"access_key": AK, "email": "supervisor@crm.com", "password": "super123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "supervisor"

    def test_login_worker_success(self, base_url):
        r = requests.post(f"{base_url}/api/auth/login", json={"access_key": AK, "email": "worker@crm.com", "password": "worker123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "worker"

    def test_login_invalid_creds(self, base_url):
        r = requests.post(f"{base_url}/api/auth/login", json={"access_key": AK, "email": "admin@crm.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_token(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == "admin@crm.com"

    def test_me_without_token(self, base_url):
        r = requests.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401


# ---------- USERS ----------
class TestUsers:
    def test_admin_list_users(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/users")
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) >= 3
        assert all("password_hash" not in u for u in users)

    def test_supervisor_list_users(self, supervisor_client, base_url):
        r = supervisor_client.get(f"{base_url}/api/users")
        assert r.status_code == 200

    def test_worker_cannot_list_users(self, worker_client, base_url):
        r = worker_client.get(f"{base_url}/api/users")
        assert r.status_code == 403

    def test_supervisor_cannot_create_user(self, supervisor_client, base_url):
        r = supervisor_client.post(f"{base_url}/api/users", json={
            "email": f"TEST_sup_{uuid.uuid4().hex[:6]}@crm.com", "password": "pw1234",
            "name": "Test", "role": "worker"
        })
        assert r.status_code == 403

    def test_admin_create_update_delete_user(self, admin_client, base_url):
        email = f"TEST_{uuid.uuid4().hex[:8]}@crm.com"
        r = admin_client.post(f"{base_url}/api/users", json={
            "email": email, "password": "pw1234", "name": "Test User", "role": "worker"
        })
        assert r.status_code == 200
        u = r.json()
        assert u["email"].lower() == email.lower() and u["role"] == "worker" and "id" in u
        uid = u["id"]

        # Verify presence in list
        lst = admin_client.get(f"{base_url}/api/users").json()
        assert any(x["id"] == uid for x in lst)

        # Update
        r2 = admin_client.patch(f"{base_url}/api/users/{uid}", json={"name": "Updated"})
        assert r2.status_code == 200 and r2.json()["name"] == "Updated"

        # Delete
        r3 = admin_client.delete(f"{base_url}/api/users/{uid}")
        assert r3.status_code == 200 and r3.json()["deleted"] == 1


# ---------- BOOTHS ----------
class TestBooths:
    def test_list_booths_admin(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/booths")
        assert r.status_code == 200
        booths = r.json()
        assert isinstance(booths, list) and len(booths) >= 1
        assert "voters_surveyed" in booths[0]
        assert "target_voters" in booths[0]

    def test_worker_sees_only_assigned(self, worker_client, admin_client, base_url):
        wb = worker_client.get(f"{base_url}/api/booths").json()
        ab = admin_client.get(f"{base_url}/api/booths").json()
        assert len(wb) <= len(ab)
        assert len(wb) >= 1

    def test_get_booth_with_workers(self, admin_client, base_url):
        booths = admin_client.get(f"{base_url}/api/booths").json()
        bid = booths[0]["id"]
        r = admin_client.get(f"{base_url}/api/booths/{bid}")
        assert r.status_code == 200
        b = r.json()
        assert "workers" in b and isinstance(b["workers"], list)

    def test_create_update_delete_booth(self, admin_client, base_url):
        r = admin_client.post(f"{base_url}/api/booths", json={
            "name": "TEST_Booth", "booth_number": f"T-{uuid.uuid4().hex[:4]}",
            "ward": "Ward Test", "constituency": "Test", "target_voters": 500
        })
        assert r.status_code == 200
        bid = r.json()["id"]

        r2 = admin_client.patch(f"{base_url}/api/booths/{bid}", json={"target_voters": 750})
        assert r2.status_code == 200 and r2.json()["target_voters"] == 750

        r3 = admin_client.delete(f"{base_url}/api/booths/{bid}")
        assert r3.status_code == 200

    def test_worker_cannot_create_booth(self, worker_client, base_url):
        r = worker_client.post(f"{base_url}/api/booths", json={
            "name": "X", "booth_number": "X-1", "ward": "W", "constituency": "C"
        })
        assert r.status_code == 403


# ---------- VOTERS ----------
class TestVoters:
    def test_list_voters(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/voters")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_voters(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/voters", params={"political_preference": "supporter"})
        assert r.status_code == 200
        for v in r.json():
            assert v["political_preference"] == "supporter"

    def test_search_voter(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/voters", params={"search": "VID"})
        assert r.status_code == 200

    def test_worker_voters_scoped(self, worker_client, base_url):
        booths = worker_client.get(f"{base_url}/api/booths").json()
        ids = {b["id"] for b in booths}
        voters = worker_client.get(f"{base_url}/api/voters").json()
        for v in voters:
            assert v["booth_id"] in ids

    def test_create_update_delete_voter(self, admin_client, base_url):
        booth = admin_client.get(f"{base_url}/api/booths").json()[0]
        r = admin_client.post(f"{base_url}/api/voters", json={
            "booth_id": booth["id"], "name": "TEST_Voter", "age": 35,
            "gender": "male", "political_preference": "neutral", "sentiment": "positive",
            "issues": ["Water Supply"], "likely_to_vote": True
        })
        assert r.status_code == 200
        vid = r.json()["id"]
        assert r.json()["surveyed_by_name"] == "Admin User"

        # GET verify persistence
        g = admin_client.get(f"{base_url}/api/voters/{vid}")
        assert g.status_code == 200 and g.json()["name"] == "TEST_Voter"

        # Update
        u = admin_client.patch(f"{base_url}/api/voters/{vid}", json={"sentiment": "negative"})
        assert u.status_code == 200 and u.json()["sentiment"] == "negative"

        # Delete
        d = admin_client.delete(f"{base_url}/api/voters/{vid}")
        assert d.status_code == 200

    def test_worker_cannot_delete_voter(self, worker_client, admin_client, base_url):
        booth = admin_client.get(f"{base_url}/api/booths").json()[0]
        r = admin_client.post(f"{base_url}/api/voters", json={"booth_id": booth["id"], "name": "TEST_DelVoter"})
        vid = r.json()["id"]
        d = worker_client.delete(f"{base_url}/api/voters/{vid}")
        assert d.status_code == 403
        admin_client.delete(f"{base_url}/api/voters/{vid}")  # cleanup


# ---------- VISITS ----------
class TestVisits:
    def test_list_visits_admin(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/visits")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_worker_visits_scoped(self, worker_client, base_url):
        r = worker_client.get(f"{base_url}/api/visits")
        assert r.status_code == 200
        me = worker_client.get(f"{base_url}/api/auth/me").json()
        for v in r.json():
            assert v["worker_id"] == me["id"]

    def test_create_visit_admin(self, admin_client, base_url):
        booth = admin_client.get(f"{base_url}/api/booths").json()[0]
        workers = [u for u in admin_client.get(f"{base_url}/api/users").json() if u["role"] == "worker"]
        r = admin_client.post(f"{base_url}/api/visits", json={
            "booth_id": booth["id"], "worker_id": workers[0]["id"],
            "scheduled_date": "2026-02-01T10:00:00+00:00", "notes": "TEST"
        })
        assert r.status_code == 200
        vid = r.json()["id"]
        # Update status
        u = admin_client.patch(f"{base_url}/api/visits/{vid}", json={"status": "completed", "voters_contacted": 10})
        assert u.status_code == 200 and u.json()["status"] == "completed"
        admin_client.delete(f"{base_url}/api/visits/{vid}")

    def test_worker_cannot_create_visit(self, worker_client, base_url):
        r = worker_client.post(f"{base_url}/api/visits", json={
            "booth_id": "x", "worker_id": "y", "scheduled_date": "2026-02-01"
        })
        assert r.status_code == 403


# ---------- ANALYTICS ----------
class TestAnalytics:
    def test_overview(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/analytics/overview")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_voters", "total_booths", "total_workers", "total_target",
                  "completion_rate", "preferences", "sentiments"]:
            assert k in d
        assert d["total_voters"] > 0
        assert d["total_booths"] >= 1

    def test_demographics(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/analytics/demographics")
        assert r.status_code == 200
        d = r.json()
        for k in ["age_groups", "gender", "religion", "caste"]:
            assert k in d

    def test_issues(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/analytics/issues")
        assert r.status_code == 200
        assert "issues" in r.json()
        assert isinstance(r.json()["issues"], list)

    def test_booth_stats(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/analytics/booth-stats")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        for k in ["booth_id", "name", "target", "surveyed", "supporters", "completion"]:
            assert k in rows[0]

    def test_engagement_trends(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/analytics/engagement-trends")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) == 14
        assert "date" in rows[0] and "count" in rows[0]
