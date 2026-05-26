import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voter-hub-8.preview.emergentagent.com").rstrip("/")
DEFAULT_ACCESS_KEY = "VIQSO-2026"
SUPER_ADMIN_KEY = "VIQSO-MASTER-2026-XKL9PQR4"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def access_key():
    return DEFAULT_ACCESS_KEY


@pytest.fixture(scope="session")
def super_admin_key():
    return SUPER_ADMIN_KEY


def _login(email, password, access_key=DEFAULT_ACCESS_KEY):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password, "access_key": access_key},
        timeout=20,
    )
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


def _client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_client(admin_token):
    return _client(admin_token)


@pytest.fixture
def supervisor_client(supervisor_token):
    return _client(supervisor_token)


@pytest.fixture
def worker_client(worker_token):
    return _client(worker_token)


@pytest.fixture(scope="session")
def super_admin_headers():
    return {"X-Super-Admin-Key": SUPER_ADMIN_KEY, "Content-Type": "application/json"}
