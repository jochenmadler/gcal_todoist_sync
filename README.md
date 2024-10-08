# Google Calendar and Todoist Sync

Two-way sync between Google Calendar and Todoist via Google Apps Script.


https://github.com/user-attachments/assets/51ad7b8b-b728-45e1-baa0-50ea582b9725


## Problem
As of August 12th 2024, Todoist does not offer a two-way sync with Google Calendar anymore, see this [Reddit thread](https://www.reddit.com/r/todoist/comments/1d896yw/google_calendar_integration/). According to the [Todoist documentation](https://todoist.com/help/articles/use-calendar-with-todoist-rCqwLCt3G?locale=en&articleId=use-calendar-with-todoist-rCqwLCt3G#h_01HXS15SKB84HE17BWKPXKJ9XG), calendar events are displayed as read-only in Todoist, and must be changed in the Google Calendar web app. Moreover, calendar events are not displayed as tasks, but as a separate, poorly formatted section in the Todoist app. There is currently no way to create a task in Todoist, and have it reflected as an event in Google Calendar.

## Solution
- Google Apps Script: A script that runs on Google's servers, allowing for seamless communication between [Google Calendar Apps Script](https://developers.google.com/apps-script/reference/calendar/calendar-event) and the [Todoist API](https://developer.todoist.com/rest/v2/#overview).
- Automatically syncs new and modified events between Google Calendar and Todoist, both ways.
- Google Calendar events are reflected as tasks in Todoist, and vice versa.
- Data that is being synced for each event/task: Modifying this in one service will reflect in the other service.
    - title
    - description
    - start date / due date
- Deleted events / completed tasks are removed from the other service, respectively.

## How to use
1. Open Google [Apps Script Console](https://script.google.com/home) and create a new project.
2. Copy and paste the contents of the file `Code.gs` into the script editor and save it.
    - `Code.gs` line 1: Set `CALENDAR_ID` with the desired Google Calendar ID. To find it, open Google Calendar web app, click on the three dots next to the calendar, then "Settings and Sharing", then scroll down to "Integrate Calendar".
    - `Code.gs` line 2: Set `TODOIST_API_TOKEN` with your Todoist API key. You can find it [here](https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB).
3. Manually execute functions to grant them permissions: In the Google [Apps Script Console](https://script.google.com/home) on the left panel, navigate to "editor", select a function to execute at the top, then click "execute". This will prompt you to authorize the script. You will see a warning popup saying the app isn’t verified. You can bypass this warning:
    - At the bottom of the "This app isn't verified" screen, click on "Advanced".
    - Click on the link that says "Go to [Your Project Name] (unsafe)".
    - Review Permissions and Allow: Click on "Allow" to grant the necessary permissions.
4. Execute the following functions manually to set up the initial state:
    - `initializeLastProcessedTime`: Set the initial time to the current time.
    - `getTodoistProjects`: List all your project and their IDs. Then, in `Code.gs` line 3 set `TODOIST_PROJECT_ID` to the ID of the project you want to sync.
    - `checkCalendarForUpdates`: Manually sync all events from Google Calendar to Todoist once (to grant permissions).
    - `checkTodoistForUpdates`: Manually sync all tasks from Todoist to Google Calendar once (to grant permissions).
5. Setup two triggers in the Google [Apps Script Console](https://script.google.com/home), one for `checkCalendarForUpdates` and `checkTodoistForUpdates`.
    - On the left panel, navigate to "Trigger".
    - Click on "Add Trigger".
    - Select the function name, the event source (Time-driven), and the type of time-based trigger as well as the interval (e.g., every 5 minutes).
    - Click on "Save". You can view the execution logs in the "Execution" tab.

## Additional Notes
- You can modify the default time for calendar events that are created from Todoist tasks by modifying the variable `DEFAULT_TASK_DURATION_MIN` in `Code.gs` line 4.
- You can modify the sync interval in the trigger settings. While 1 minute is the minimum interval, it is recommended to set it to 5 minutes to avoid breaking the "Triggers total runtime" rate limit, see [Quotas for Google Services](https://developers.google.com/apps-script/guides/services/quotas).
