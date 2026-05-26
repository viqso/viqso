import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voter-hub-8.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login("admin@crm.com", "admin123")


@pytest.fixture(scope="session")
def supervisor_token():
    return _login("supervisor@crm.com", "super123")


@pytest.fixture(scope="session")
def worker_token():
    return _login("worker@crm.com", "worker123")


@pytest.fixture
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture
def supervisor_client(supervisor_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {supervisor_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture
def worker_client(worker_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {worker_token}", "Content-Type": "application/json"})
    return s
