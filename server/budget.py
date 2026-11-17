"""Hard daily cap on Meta API calls — don't trust spend-limit notices."""
import datetime
import json
import os
from pathlib import Path

FILE = Path(__file__).parent / ".cache" / "budget.json"


def take() -> bool:
    cap = int(os.getenv("MAX_SPEND_CALLS_PER_DAY", "500"))
    today = datetime.date.today().isoformat()
    state = json.loads(FILE.read_text()) if FILE.exists() else {}
    if state.get("date") != today:
        state = {"date": today, "calls": 0}
    if state["calls"] >= cap:
        return False
    state["calls"] += 1
    FILE.parent.mkdir(parents=True, exist_ok=True)
    FILE.write_text(json.dumps(state))
    return True
