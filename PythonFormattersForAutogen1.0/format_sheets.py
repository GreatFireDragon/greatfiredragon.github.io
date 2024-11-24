import json
import os
import asyncio
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from textFormatters import format_original

# Define the path to your service account key file and the scopes
SERVICE_ACCOUNT_FILE = 'batch-articles-ds-c7b314d038cf.json'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# Create an OAuth2 client to authorize the API call
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

# Create the Sheets API service
sheets_service = build('sheets', 'v4', credentials=credentials)

async def get_user_input(prompt):
    return input(prompt)

async def get_sheet_data(spreadsheet_id, sheet_name, column):
    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=f'{sheet_name}!{column}'
        ).execute()
        return result.get('values', [])
    except HttpError as err:
        print(f"An error occurred: {err}")
        return []

async def write_sheet_data(spreadsheet_id, sheet_name, column, values):
    try:
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f'{sheet_name}!{column}',
            valueInputOption='RAW',
            body={
                'values': [[value] for value in values]
            }
        ).execute()
    except HttpError as err:
        print(f"An error occurred: {err}")

async def main():
    spreadsheet_id = await get_user_input("Enter the Google Sheets document ID: ") or "1O3P4OoFLrAfSOnP6oRzjzlQzYzsiJoiRxDjzHMCaljk"
    spreadsheet_id = spreadsheet_id.split('/d/')[1].split('/')[0] if '/d/' in spreadsheet_id else spreadsheet_id
    sheet_name = await get_user_input("Enter the sheet name (default: Темы): ") or "Темы"
    input_column = await get_user_input("Enter the column to take data from (default: F:F): ") or "F:F"
    output_column = await get_user_input("Enter the column to output data to (default: G:G): ") or "G:G"

    data = await get_sheet_data(spreadsheet_id, sheet_name, input_column)

    formatted_data = [{'original': cell[0], 'formatted': format_original(cell[0])} for cell in data if cell]

    with open('buffer.json', 'w', encoding='utf-8') as f:
        json.dump(formatted_data, f, ensure_ascii=False, indent=2)

    formatted_values = [entry['formatted'] for entry in formatted_data]

    await write_sheet_data(spreadsheet_id, sheet_name, output_column, formatted_values)

    print("Data processed and written to Google Sheets successfully.")

asyncio.run(main())
