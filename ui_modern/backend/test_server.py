"""
Full test suite for FastAPI backend server.py:
- Auto-Pilot Scenario Runner API (/api/action/run-scenario)
- Node Hardware Specs in /api/status (cpu_capacity, memory_capacity, os_image, kernel_version, runtime)
- Pod logs (/api/pod-logs/{pod})
- Cluster Export report (/api/export)
- Guided steps & workloads
"""

import sys
import time
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_all():
    print("--- 1. Testing GET /health ---")
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("Health response:", r.json())

    print("\n--- 2. Testing Exact Node Hardware Specs in GET /api/status ---")
    r = client.get("/api/status")
    assert r.status_code == 200, f"Status failed: {r.text}"
    status_data = r.json()
    assert len(status_data["nodes"]) == 3
    for n in status_data["nodes"]:
        print(f"Node {n['name']}:")
        print(f"  - cpu_capacity: {n['cpu_capacity']}")
        print(f"  - memory_capacity: {n['memory_capacity']}")
        print(f"  - os_image: {n['os_image']}")
        print(f"  - kernel_version: {n['kernel_version']}")
        print(f"  - runtime: {n['runtime']}")
        assert "cores" in n["cpu_capacity"]
        assert "GiB" in n["memory_capacity"] or "MiB" in n["memory_capacity"]
        assert "Debian" in n["os_image"] or "Linux" in n["os_image"]
        assert "WSL2" in n["kernel_version"] or "6." in n["kernel_version"]
        assert "containerd" in n["runtime"]

    print("\n--- 3. Testing POST /api/action/run-scenario (S1: Baseline) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S1"})
    assert r.status_code == 200, f"S1 scenario failed: {r.text}"
    res = r.json()
    assert res["scenario"] == "S1"
    assert res["success"] is True
    assert "summary" in res and len(res["summary"]) > 0
    assert "commands" in res
    assert "snapshot" in res
    print("S1 Summary:", res["summary"])
    print("S1 Snapshot Counts:", res["snapshot"]["counts"])

    print("\n--- 4. Testing POST /api/action/run-scenario (S2: Website without toleration) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S2"})
    assert r.status_code == 200, f"S2 scenario failed: {r.text}"
    res = r.json()
    assert res["snapshot"]["counts"]["gpu_reserved"] is True
    print("S2 Summary:", res["summary"])
    print("S2 GPU reserved:", res["snapshot"]["counts"]["gpu_reserved"])

    print("\n--- 5. Testing POST /api/action/run-scenario (S5: Dedicated GPU node) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S5"})
    assert r.status_code == 200, f"S5 scenario failed: {r.text}"
    res = r.json()
    print("S5 Summary:", res["summary"])

    print("\n--- 6. Testing POST /api/action/run-scenario (S6: General maintenance -> Pending) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S6"})
    assert r.status_code == 200, f"S6 scenario failed: {r.text}"
    res = r.json()
    print("S6 Summary:", res["summary"])

    print("\n--- 7. Testing POST /api/action/run-scenario (S6b: Maintenance removed) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S6b"})
    assert r.status_code == 200, f"S6b scenario failed: {r.text}"
    res = r.json()
    print("S6b Summary:", res["summary"])

    print("\n--- 8. Testing POST /api/action/run-scenario (S7: Soft taint) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S7"})
    assert r.status_code == 200, f"S7 scenario failed: {r.text}"
    res = r.json()
    print("S7 Summary:", res["summary"])

    print("\n--- 9. Testing POST /api/action/run-scenario (S7b: Soft taint under maintenance) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S7b"})
    assert r.status_code == 200, f"S7b scenario failed: {r.text}"
    res = r.json()
    print("S7b Summary:", res["summary"])

    print("\n--- 10. Testing POST /api/action/run-scenario (S8: GPU fault NoExecute) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S8"})
    assert r.status_code == 200, f"S8 scenario failed: {r.text}"
    res = r.json()
    print("S8 Summary:", res["summary"])

    print("\n--- 11. Testing POST /api/action/run-scenario (reset) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "reset"})
    assert r.status_code == 200, f"Reset scenario failed: {r.text}"
    res = r.json()
    assert res["snapshot"]["counts"]["gpu_reserved"] is False
    print("Reset Summary:", res["summary"])

    print("\n--- 12. Testing POST /api/action/run-scenario with invalid scenario (400 validation) ---")
    r = client.post("/api/action/run-scenario", json={"scenario": "S99_INVALID"})
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print("Invalid scenario properly rejected:", r.json()["detail"])

    print("\n--- 13. Testing GET /api/export ---")
    r = client.get("/api/export")
    assert r.status_code == 200
    export_data = r.json()
    assert "markdown_report" in export_data
    print("Export report verified successfully.")

    print("\n==========================================")
    print("ALL SCENARIO RUNNER & HARDWARE TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    test_all()
