import io
import base64
import urllib

import qrcode
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime


signer = TimestampSigner()
MAX_AGE_OF_SIGNED_TOKEN = 300  # 5 minutes


def verify_signed_token(token, max_age=MAX_AGE_OF_SIGNED_TOKEN):
    try:
        return signer.unsign(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None


def generate_signed_token(token):
    return signer.sign(token)


def generate_qrcode(text_to_encode: str):
    qr = qrcode.make(text_to_encode)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    return buf


def get_current_path(request):
    # eg. http://127.0.0.1:8000/users?token=token#token
    return f"{request.scheme}://{request.get_host()}{request.get_full_path()}".strip(
        "/"
    )


def get_current_domain(request):
    # eg. http://127.0.0.1:8000
    return f"{request.scheme}://{request.get_host()}".strip("/")


class WaitlistSpreadSheet:
    GOOGLE_CREDENTIALS_FILE = "credentials/zeefas.json"
    SHEET_ID = "16k0JfWOxpubIY2JHSGO2i3k2KzCa0faUBpXRzx1mpnk"

    @classmethod
    def append_to_waitlist(cls, email):
        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
        creds = Credentials.from_service_account_file(
            cls.GOOGLE_CREDENTIALS_FILE, scopes=scopes
        )
        client = gspread.authorize(creds)
        sheet = client.open_by_key(cls.SHEET_ID).sheet1

        # Ensure headers exist
        values = sheet.get_all_values()
        if not values:
            sheet.update("A1:B1", [["Email", "Joined At"]])

        # Find the next empty row *based on column A*
        next_row = len(sheet.col_values(1)) + 1  # col_values(1) is column A

        # Write explicitly to columns A and B
        email_value = email
        timestamp_value = datetime.now().isoformat()

        sheet.update(
            f"A{next_row}:B{next_row}",
            [[email_value, timestamp_value]],
            value_input_option="USER_ENTERED",
        )
