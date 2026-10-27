import asyncio
import os
import json
from pathlib import Path
from playwright.async_api import async_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "screenshots"

USER_DATA = {
    "id": "296632c1-d499-440f-b352-3639efa6ad24",
    "name": "VIGNESH KARTHIKEYAN",
    "email": "workofvicky@gmail.com"
}
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyOTY2MzJjMS1kNDk5LTQ0MGYtYjM1Mi0zNjM5ZWZhNmFkMjQiLCJlbWFpbCI6IndvcmtvZnZpY2t5QGdtYWlsLmNvbSIsIm5hbWUiOiJWSUdORVNIIEtBUlRISUtFWUFOIiwiZXhwIjoxNzkzNjM3ODUyLCJpYXQiOjE3OTMwMzMwNTJ9.R0ogv37qRI6kt82BKHshGus_rjUIewqiw5XZfanMZBQ"

ACTIVE_INTERVIEW_ID = "26fea939-8425-4cd4-9a8e-01b7d9bd878a"
COMPLETED_INTERVIEW_ID = "8a598a94-f237-48fe-9249-dcd05a5764cb"

async def capture_all():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
            args=["--hide-scrollbars", "--disable-gpu"]
        )
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # 1. Landing Page (Unauthenticated / Public)
        print("[1/6] Capturing Landing Page...")
        await page.goto("http://localhost:5173/resume", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(OUTPUT_DIR / "01_landing_page.png"), full_page=False)

        # Authenticate via localStorage
        await page.evaluate(f"""() => {{
            localStorage.setItem('token', '{TOKEN}');
            localStorage.setItem('user', JSON.stringify({json.dumps(USER_DATA)}));
        }}""")

        # 2. Target Companies Catalog
        print("[2/6] Capturing Target Companies Catalog...")
        await page.goto("http://localhost:5173/companies", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(OUTPUT_DIR / "02_target_companies.png"), full_page=False)

        # 3. Past Reports Tab
        print("[3/6] Capturing Past Reports Tab...")
        # Click on Past Reports tab button
        try:
            reports_tab = page.locator("button:has-text('Past Reports')")
            if await reports_tab.count() > 0:
                await reports_tab.click()
                await page.wait_for_timeout(1000)
                await page.screenshot(path=str(OUTPUT_DIR / "03_past_reports.png"), full_page=False)
        except Exception as e:
            print("Error clicking reports tab:", e)

        # 4. Active Interview Room
        print("[4/6] Capturing Active Interview Room...")
        await page.goto(f"http://localhost:5173/interview/{ACTIVE_INTERVIEW_ID}", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUTPUT_DIR / "04_voice_interview_room.png"), full_page=False)

        # 5. Completed Interview Scorecard Modal
        print("[5/6] Capturing Evaluation Scorecard Modal...")
        await page.goto(f"http://localhost:5173/interview/{COMPLETED_INTERVIEW_ID}", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUTPUT_DIR / "05_evaluation_scorecard_modal.png"), full_page=False)

        # 6. Printable Evaluation Dossier Report
        print("[6/6] Capturing Printable Evaluation Dossier Report...")
        await page.goto(f"http://localhost:5173/interview/{COMPLETED_INTERVIEW_ID}/report", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUTPUT_DIR / "06_printable_evaluation_dossier.png"), full_page=True)

        await browser.close()
        print("All screenshots successfully captured in screenshots/ folder!")

if __name__ == "__main__":
    asyncio.run(capture_all())
