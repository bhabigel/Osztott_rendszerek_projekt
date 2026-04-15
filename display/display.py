#!/usr/bin/env python3
"""
Feladat 7: Kijelzo alkalmazas — socket kezeles, listen, accept, kulon threadek
Feladat 8: Thread-ben fut; feleletvalasztosnal szamlalot novel,
           szoveges valasznal gorgetős listat jelenít meg
Feladat 6: Web RPC fogado vegpont (GET /update?nev=X&szavazat=Y&...)
Feladat 15: Automatikus frissites (1 masodpercenkent ujrarajzol)

Inditas:  python display/display.py
          python display/display.py 5001    (egyedi port)
"""

import http.server
import threading
import urllib.parse
import urllib.request
import json
import time
import os
import sys
from datetime import datetime


# ── Thread-safe allapot ────────────────────────────────────────────────────────
# Feladat 6: utközés kezelese Lock-kal — egyszerre tobb HTTP kerés erkezhet
lock = threading.Lock()

state = {
    "selected_bet_id": "",
    "question":    "",
    "type":        "choice",   # "choice" | "text"
    "counts":      {},         # { option: count } — feleletvalasztoshoz
    "text_votes":  [],         # [(nev, szoveg), ...] — szoveges valaszokhoz
    "total":       0,
    "last_update": None,
}


# ── HTTP handler (Feladat 7: accept, kulon threadek) ──────────────────────────
class DisplayHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # alap HTTP logok elnyomasa — a kijelzo mar rajzol a konzolra

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        def p(key):
            return params.get(key, [""])[0]

        # ── GET /update — uj szavazat erkezik ─────────────────────────────
        if parsed.path == "/update":
            bet_id   = p("bet_id")
            nev      = p("nev")      or "Ismeretlen"
            szavazat = p("szavazat")
            kerdes   = p("kerdes")
            tipus    = p("tipus")    or "choice"

            if not szavazat:
                self._respond(400, "Hianyzo szavazat parameter")
                return

            # Feladat 6: utközés kezelese — Lock biztositja az atomicitast
            with lock:
                selected = state["selected_bet_id"]
                # Csak a startupnál kivalasztott kerdest figyeli.
                if selected and bet_id and bet_id != selected:
                    self._respond(200, "IGNORED")
                    return
                # Visszafelé kompatibilitás: ha nincs bet_id, akkor kerdes szovege alapjan szur.
                if selected and not bet_id and state["question"] and kerdes and kerdes != state["question"]:
                    self._respond(200, "IGNORED")
                    return

                if kerdes:
                    state["question"] = kerdes
                if bet_id:
                    state["selected_bet_id"] = bet_id
                state["type"] = tipus

                if tipus == "choice":
                    # Feladat 8: feleletvalasztosnal szamlalot noveljuk
                    state["counts"][szavazat] = state["counts"].get(szavazat, 0) + 1
                else:
                    # Feladat 8: szoveges valasznál gorgetős lista (max 20 elem)
                    state["text_votes"].append((nev, szavazat))
                    if len(state["text_votes"]) > 20:
                        state["text_votes"].pop(0)

                state["total"]       += 1
                state["last_update"]  = datetime.now().strftime("%H:%M:%S")

            self._respond(200, "OK")

        # ── GET /reset — allapot nullazasa ────────────────────────────────
        elif parsed.path == "/reset":
            with lock:
                state["counts"]      = {}
                state["text_votes"]  = []
                state["total"]       = 0
                state["last_update"] = None
            self._respond(200, "Reset OK")

        # ── GET /status — allapot JSON-ban ────────────────────────────────
        elif parsed.path == "/status":
            import json
            with lock:
                snap = dict(state)
            self._respond(200, json.dumps(snap, ensure_ascii=False), "application/json")

        else:
            self._respond(404, "Not found")

    def _respond(self, code, body, content_type="text/plain; charset=utf-8"):
        enc = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(enc)))
        self.end_headers()
        self.wfile.write(enc)


# ── Terminal megjelenites (Feladat 8 + 15) ────────────────────────────────────
CLEAR = "cls" if os.name == "nt" else "clear"

C = {
    "reset":  "\033[0m",
    "bold":   "\033[1m",
    "cyan":   "\033[96m",
    "green":  "\033[92m",
    "yellow": "\033[93m",
    "red":    "\033[91m",
    "blue":   "\033[94m",
    "gray":   "\033[90m",
    "white":  "\033[97m",
    "purple": "\033[95m",
}

def c(color, text):
    return C.get(color, "") + str(text) + C["reset"]

def progress_bar(count, total, width=32):
    if total == 0:
        return c("gray", "░" * width)
    filled = round((count / total) * width)
    return c("cyan", "█" * filled) + c("gray", "░" * (width - filled))


def render_choice(snap):
    """Feladat 8: feleletvalasztosnal szamlalo + progress bar"""
    total   = snap["total"]
    counts  = snap["counts"]

    if not counts:
        print(c("gray", "  Meg nincs szavazat."))
        return

    sorted_opts = sorted(counts.items(), key=lambda x: -x[1])
    for option, cnt in sorted_opts:
        pct = round((cnt / total) * 100) if total > 0 else 0
        bar = progress_bar(cnt, total)
        print(f"  {c('bold', f'{option:<18}')} {bar}  "
              f"{c('green', str(cnt))} szavazat  ({pct}%)")

    print()
    print(c("gray", f"  Osszes szavazat: {c('bold', str(total))}"))


def render_text(snap):
    """Feladat 8: szoveges valasznál gorgetős lista (legujabb elol)"""
    votes = snap["text_votes"]
    total = snap["total"]

    if not votes:
        print(c("gray", "  Meg nincs szoveges valasz."))
        return

    print(c("bold", f"  Legutobbi valaszok ({len(votes)}/{total}):"))
    print()
    for i, (nev, szoveg) in enumerate(reversed(votes)):
        idx    = c("cyan",  f"  [{i + 1:>2}]")
        name   = c("bold",  nev)
        answer = c("white", szoveg)
        print(f"{idx} {name}: {answer}")


def fetch_questions(limit=5):
    """Lekeri az aktiv kerdeseket a backendrol."""
    api_candidates = []
    env_api = os.getenv("VOTING_API_URL", "").strip()
    if env_api:
        api_candidates.append(env_api.rstrip("/"))
    api_candidates.extend(["http://localhost:8081", "http://localhost:3000"])

    last_err = None
    for base in api_candidates:
        try:
            req = urllib.request.Request(f"{base}/api/bets", method="GET")
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, list):
                return data[:limit], base
            last_err = "API valasz nem lista"
        except Exception as err:
            last_err = str(err)
    raise RuntimeError(f"Nem sikerult kerdeslistat lekerni: {last_err}")


def choose_question():
    """Indulaskor 5 kerdes listazasa, valasztas kerdes ID alapjan."""
    questions, used_api = fetch_questions(limit=5)
    if not questions:
        raise RuntimeError("Nincs aktiv kerdes a rendszerben (/api/bets ures).")

    print(c("bold", "\nAktiv kerdesek (max 5):"))
    for i, q in enumerate(questions, start=1):
        qtext = str(q.get("question", "")).strip() or "(uress)"
        qtype = str(q.get("questionType", "choice"))
        print(f"  {i}. tipus={qtype} | kerdes={qtext}")

    indexed_questions = [q for q in questions if q.get("_id")]
    if not indexed_questions:
        raise RuntimeError("A kerdeslistaban nincs ervenyes _id.")

    while True:
        picked = input("\nIrj be egy sorszamot (1-5): ").strip()
        if not picked.isdigit():
            print("Hibas sorszam. Szamot adj meg (pl. 1).")
            continue

        idx = int(picked)
        if 1 <= idx <= len(indexed_questions):
            selected = indexed_questions[idx - 1]
            return {
                "id": str(selected.get("_id")),
                "index": idx,
                "question": str(selected.get("question", "")),
                "type": str(selected.get("questionType", "choice")),
                "api": used_api,
            }
        print("Hibas sorszam. Valassz a listaban szereplo sorszamok kozul.")


def fetch_current_results(api_base, bet_id, question_type):
    """A kivalasztott kerdes jelenlegi valaszait tolti be a backendrol."""
    safe_bet_id = urllib.parse.quote(str(bet_id), safe="")
    req = urllib.request.Request(f"{api_base}/api/bet/{safe_bet_id}", method="GET")
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    raw_votes = data.get("votes", []) if isinstance(data, dict) else []
    counts = {}
    total = 0
    for row in raw_votes:
        option = str(row.get("_id", ""))
        try:
            cnt = int(row.get("count", 0))
        except Exception:
            cnt = 0
        if not option or cnt <= 0:
            continue
        counts[option] = counts.get(option, 0) + cnt
        total += cnt

    text_votes = []
    if question_type == "text" and counts:
        # A backend itt aggregalt adatot ad; szintetikus "Korabbi" elemekkel toltjuk a listat.
        remaining = 20
        for option, cnt in sorted(counts.items(), key=lambda x: -x[1]):
            take = min(cnt, remaining)
            text_votes.extend([("Korabbi", option)] * take)
            remaining -= take
            if remaining <= 0:
                break

    return {
        "counts": counts,
        "text_votes": text_votes,
        "total": total,
        "question": str(data.get("question", "")) if isinstance(data, dict) else "",
        "type": str(data.get("questionType", question_type)) if isinstance(data, dict) else question_type,
    }


def display_loop():
    """
    Feladat 15: folyamatos ujrarajzolas — 1 masodpercenkent fut
    Feladat 8:  eldonti, hogy choice vagy text megjelenítőt hív
    """
    while True:
        with lock:
            snap = {
                "question":   state["question"],
                "selected_bet_id": state["selected_bet_id"],
                "type":       state["type"],
                "counts":     dict(state["counts"]),
                "text_votes": list(state["text_votes"]),
                "total":      state["total"],
                "last_update": state["last_update"],
            }

        os.system(CLEAR)

        W = 62
        print(c("bold", "=" * W))
        print(c("bold", c("purple", "  SZAVAZO RENDSZER — KIJELZO")))
        print(c("bold", "=" * W))
        print()
        print(c("gray", f"  Figyelt kerdes id: {snap['selected_bet_id'] or '-'}"))

        if snap["question"]:
            print(c("bold", "  Kerdes: ") + c("yellow", snap["question"]))
        else:
            print(c("gray", "  Varakozas szavazasra..."))

        print()
        print(c("bold", "-" * W))
        print()

        # Feladat 8: tipus alapjan donti el mit rajzol
        if snap["type"] == "choice":
            render_choice(snap)
        else:
            render_text(snap)

        print()
        print(c("bold", "-" * W))

        if snap["last_update"]:
            print(c("gray", f"  Utolso frissites: {snap['last_update']}"
                             f"  |  Port: {PORT}"))
        else:
            print(c("gray", f"  Varakozas...  |  Port: {PORT}"))

        print(c("bold", "=" * W))

        # Feladat 15: 1 masodperces intervallum
        time.sleep(1)


# ── Main ───────────────────────────────────────────────────────────────────────
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5001

if __name__ == "__main__":
    try:
        selected = choose_question()
    except Exception as err:
        print(f"Kijelzo indulasa sikertelen: {err}")
        sys.exit(1)

    preloaded = None
    try:
        preloaded = fetch_current_results(selected["api"], selected["id"], selected["type"])
    except Exception as err:
        print(f"Figyelmeztetes: a korabbi valaszok betoltese sikertelen ({err}).")

    with lock:
        state["selected_bet_id"] = selected["id"]
        state["question"] = selected["question"]
        state["type"] = selected["type"]
        if preloaded:
            state["question"] = preloaded["question"] or state["question"]
            state["type"] = preloaded["type"] or state["type"]
            state["counts"] = preloaded["counts"]
            state["text_votes"] = preloaded["text_votes"]
            state["total"] = preloaded["total"]
            state["last_update"] = datetime.now().strftime("%H:%M:%S") if preloaded["total"] > 0 else None

    # Feladat 15: display frissito thread (daemon — program vegevel leall)
    t = threading.Thread(target=display_loop, daemon=True)
    t.start()

    # Feladat 7: ThreadingHTTPServer — minden bejelentkező kapcsolatot
    # kulon threadben kezel; ha nincs szabad thread, varakozik (queue)
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), DisplayHandler)

    # Kis varakozas, hogy a display loop elinduljon a szerver uzenet elott
    time.sleep(0.3)
    print(f"Kijelzo HTTP szerver indul a {PORT} porton...")
    print("Vegpont: GET /update?bet_id=ID&nev=X&szavazat=Y&kerdes=Z&tipus=choice")
    print("A kijelzo csak a kivalasztott kerdes id-jat figyeli.")
    print("Leallitas: Ctrl+C\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nKijelzo leallitva.")
        server.shutdown()
