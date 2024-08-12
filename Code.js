var CALENDAR_ID = 'xx'
var TODOIST_API_TOKEN = 'xx'
var TODOIST_PROJECT_ID_INBOX = 'xx'
var DEFAULT_TASK_DURATION_MIN = 60;


function getGoogleToTodoistPairs() {
  var googleToTodoist = PropertiesService.getScriptProperties().getProperty('GOOGLE_TO_TODOIST_PAIRS');
  return googleToTodoist ? JSON.parse(googleToTodoist) : {};
}

function getTodoistToGooglePairs() {
  var todoistToGoogle = PropertiesService.getScriptProperties().getProperty('TODOIST_TO_GOOGLE_PAIRS');
  return todoistToGoogle ? JSON.parse(todoistToGoogle) : {};
}

function logMappings() {
  // Retrieve the mappings
  var googleToTodoist = getGoogleToTodoistPairs();
  var todoistToGoogle = getTodoistToGooglePairs();
  
  // Log the mappings
  Logger.log('Google to Todoist Mapping: ' + JSON.stringify(googleToTodoist));
  Logger.log('Todoist to Google Mapping: ' + JSON.stringify(todoistToGoogle));
}

function deleteByGoogleEventId() {
  var googleEventId = '50tn33a5ac17f6gav21n9a5rhd@google.com';

  // Retrieve the mappings
  var googleToTodoist = getGoogleToTodoistPairs();
  var todoistToGoogle = getTodoistToGooglePairs();

  // Find the corresponding Todoist task ID
  var todoistTaskId = googleToTodoist[googleEventId] ? googleToTodoist[googleEventId].todoistTaskId : null;

  if (todoistTaskId) {
    // Delete from both mappings
    delete googleToTodoist[googleEventId];
    delete todoistToGoogle[todoistTaskId];
    Logger.log('Deleted Google Event ID: ' + googleEventId + ' and Todoist Task ID: ' + todoistTaskId);

    // Save the updated mappings
    PropertiesService.getScriptProperties().setProperty('GOOGLE_TO_TODOIST_PAIRS', JSON.stringify(googleToTodoist));
    PropertiesService.getScriptProperties().setProperty('TODOIST_TO_GOOGLE_PAIRS', JSON.stringify(todoistToGoogle));
    Logger.log('Updated mappings after deletion.');
    Logger.log('Google to Todoist Mapping: ' + JSON.stringify(googleToTodoist));
    Logger.log('Todoist to Google Mapping: ' + JSON.stringify(todoistToGoogle));
  } else {
    Logger.log('No mapping found for Google Event ID: ' + googleEventId);
  }
}

function deleteByTodoistTaskId() {
  var todoistTaskId = '';

  // Retrieve the mappings
  var googleToTodoist = getGoogleToTodoistPairs();
  var todoistToGoogle = getTodoistToGooglePairs();

  // Find the corresponding Google Event ID
  var googleEventId = todoistToGoogle[todoistTaskId] ? todoistToGoogle[todoistTaskId].googleEventId : null;

  if (googleEventId) {
    // Delete from both mappings
    delete googleToTodoist[googleEventId];
    delete todoistToGoogle[todoistTaskId];
    Logger.log('Deleted Todoist Task ID: ' + todoistTaskId + ' and Google Event ID: ' + googleEventId);

    // Save the updated mappings
    PropertiesService.getScriptProperties().setProperty('GOOGLE_TO_TODOIST_PAIRS', JSON.stringify(googleToTodoist));
    PropertiesService.getScriptProperties().setProperty('TODOIST_TO_GOOGLE_PAIRS', JSON.stringify(todoistToGoogle));
    Logger.log('Updated mappings after deletion.');
    Logger.log('Google to Todoist Mapping: ' + JSON.stringify(googleToTodoist));
    Logger.log('Todoist to Google Mapping: ' + JSON.stringify(todoistToGoogle));
  } else {
    Logger.log('No mapping found for Todoist Task ID: ' + todoistTaskId);
  }
}


// Function to initialize the last processed time
function initializeLastProcessedTime() {
  var now = new Date();
  PropertiesService.getScriptProperties().setProperty('LAST_PROCESSED_TIME', now.toISOString());
  Logger.log('Initialized LAST_PROCESSED_TIME to: ' + now.toISOString());
}


// Trigger to check the Google calendar for new or updated events
function checkCalendarForUpdates() {
  Logger.log('Google Calendar: Starting to check calendar events...');

  // Retrieve mapping dictionaries
  var googleToTodoist = getGoogleToTodoistPairs();
  var todoistToGoogle = getTodoistToGooglePairs();
  Logger.log('Retrieved googleToTodoist: ' + JSON.stringify(googleToTodoist));
  Logger.log('Retrieved todoistToGoogle: ' + JSON.stringify(todoistToGoogle));

  // Manage time
  var lastProcessedTime = PropertiesService.getScriptProperties().getProperty('LAST_PROCESSED_TIME');
  var lastProcessedDate = lastProcessedTime ? new Date(lastProcessedTime) : new Date(0); // If not set, start from epoch
  var now = new Date();
  var startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // Two weeks ago
  var endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // Two weeks in the future

  // Retrieve current calendar events
  var events = CalendarApp.getCalendarById(CALENDAR_ID).getEvents(startDate, endDate);

  // Create a set of processed event IDs
  var processedEventIds = new Set();

  // Process each event
  events.forEach(function(event) {
    Logger.log('Event: ' + event.getTitle() + ', Start: ' + event.getStartTime() + ', End: ' + event.getEndTime());

    // Extract date and time from the event start time and convert to local time string
    var startDateTime = event.getStartTime(); // Get the start time as a Date object
    var localStartDateTime = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

    // Skip all events that are all-day or previous to startDate
    if (event.isAllDayEvent() || event.getStartTime() < startDate) {
      Logger.log('Skipping all-day or past event: ' + event.getTitle());
      return; // Skip all-day events and past events
    }

    // Check if the event is already in the mappings
    var googleEventId = event.getId();
    if (googleToTodoist[googleEventId]) {
      var todoistTaskMap = googleToTodoist[googleEventId];
      var todoistTaskId = todoistTaskMap.todoistTaskId;
      var googleEventMap = todoistToGoogle[todoistTaskId];

      // Check whether title, description, or due_datetime has changed
      var titleChanged = event.getTitle() !== googleEventMap.title;
      var descriptionChanged = event.getDescription() !== googleEventMap.description;
      var dueDateTimeChanged = localStartDateTime !== googleEventMap.due_datetime;

      // If some of the metadata changed, update Todoist task and mappings
      if (titleChanged || descriptionChanged || dueDateTimeChanged) {
        Logger.log('title changed changed: ' + titleChanged);
        Logger.log('description changed changed: ' + descriptionChanged);
        Logger.log('due_datetime changed: ' + dueDateTimeChanged);
        var title = event.getTitle();
        var description = event.getDescription();
        var due_datetime = localStartDateTime;

        // Update todoistTask
        updateTodoistTask(todoistTaskId, title, description, due_datetime);

        // Update both Mappings
        googleEventMap.title = title;
        googleEventMap.description = description;
        googleEventMap.due_datetime = due_datetime;
        todoistTaskMap.title = title;
        todoistTaskMap.description = description;
        todoistTaskMap.due_datetime = due_datetime;
      }

      processedEventIds.add(googleEventId); // Mark event as processed
      Logger.log('Skipping EventId: ' + googleEventId + ' -> taskId: ' + todoistTaskId + ' -> EventId: ' + googleEventMap.googleEventId);
      return;
    } else {
      Logger.log('No existing Todoist task ID found for Google Calendar event: ' + googleEventId);

      // Create new Todoist task
      var todoistResponseData = createTodoistTaskFromCalendarEvent(event);

      // Add Google event ID and correspondig Todoist task ID to mappings
      googleToTodoist[googleEventId] = {
        'todoistTaskId': todoistResponseData.id,
        'title': todoistResponseData.content,
        'description': todoistResponseData.description,
        'due_datetime': localStartDateTime,
      };
      todoistToGoogle[todoistResponseData.id] = {
        'googleEventId': googleEventId,
        'title': event.getTitle(),
        'description': event.getDescription(),
        'due_datetime': localStartDateTime,
      };

      processedEventIds.add(googleEventId); // Mark event as processed
    }
  });

  // Remove entries from mappings where the Calendar event no longer exists
  for (var googleEventId in googleToTodoist) {
    if (!processedEventIds.has(googleEventId)) {
      var todoistTaskId = googleToTodoist[googleEventId].todoistTaskId;
      
      // Remove from both mappings
      delete googleToTodoist[googleEventId];
      delete todoistToGoogle[todoistTaskId];

      // Delete the task in Todoist
      deleteTodoistTask(todoistTaskId);
    }
  }

  // Store the updated mappings after all modifications
  PropertiesService.getScriptProperties().setProperty('GOOGLE_TO_TODOIST_PAIRS', JSON.stringify(googleToTodoist));
  PropertiesService.getScriptProperties().setProperty('TODOIST_TO_GOOGLE_PAIRS', JSON.stringify(todoistToGoogle));

  Logger.log('Google Calendar: Completed checking calendar events.');
}


function updateCalendarEvent(calendarEventId, updatedTitle, updatedDescription, updatedDueDateTime) {
  Logger.log('Updating Google calendar event ID: ' + calendarEventId);

  // Retrieve the calendar event by its ID
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  var event = calendar.getEventById(calendarEventId);
  
  // Update event metadata
  event.setTitle(updatedTitle);
  event.setDescription(updatedDescription);
  var newStartTime = new Date(updatedDueDateTime);
  var newEndTime = new Date(newStartTime.getTime() + DEFAULT_TASK_DURATION_MIN * 60 * 1000);
  event.setTime(newStartTime, newEndTime);
  return;
}


// Function to delete a calendar event based on its Id
function deleteCalendarEvent(calendarEventId) {
  try {
    var event = CalendarApp.getCalendarById(CALENDAR_ID).getEventById(calendarEventId);
    if (event) {
      event.deleteEvent();
      Logger.log('Deleted Google Calendar event: ' + calendarEventId);
    }
  } catch (error) {
    Logger.log('Error deleting event: ' + error.message);
  }

}


function createTodoistTaskFromCalendarEvent(event) {
  Logger.log('Creating Todoist task from Google Calendar event: ' + event.getTitle());

  // Extract date and time from the event start time and convert to local time string
  var startDateTime = event.getStartTime(); // Get the start time as a Date object
  var localStartDateTime = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  var localDatePart = localStartDateTime.split('T')[0]; // "2024-08-11"

  // Create the due object for Todoist
  var due = {
    'date': localDatePart, // e.g., "2024-08-11"
    'datetime': localStartDateTime // e.g., "2024-08-11T22:00:00"
  };

  // Prepare the event data for Todoist
  var eventData = {
    'content': event.getTitle(),
    'description': event.getDescription() || '',
    'due_datetime': due.datetime, // Using 'due_datetime' instead of 'due'
  };

  var url = 'https://api.todoist.com/rest/v2/tasks';
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + TODOIST_API_TOKEN
    },
    'payload': JSON.stringify(eventData)
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());
    Logger.log('Task created in Todoist: ' + JSON.stringify(responseData));
    return responseData;
  } catch (error) {
    Logger.log('Error creating task in Todoist: ' + error.message);
    return;
  }
}


// Trigger to check Todoist API for new or updated tasks
function checkTodoistForUpdates() {
  Logger.log('Todoist API: Starting to check tasks...');

  // Retrieve mapping dictionaries
  var googleToTodoist = getGoogleToTodoistPairs();
  var todoistToGoogle = getTodoistToGooglePairs();
  Logger.log('Retrieved googleToTodoist: ' + JSON.stringify(googleToTodoist));
  Logger.log('Retrieved todoistToGoogle: ' + JSON.stringify(todoistToGoogle));

  // Retrieve current Todoist tasks
  var tasks = getTodoistTasks();

  // Create a set of processed task IDs
  var processedTaskIds = new Set();

  // Process each task
  tasks.forEach(function(task) {
    Logger.log('Processing task ID: ' + JSON.stringify(task.id));

    // Check if the task is already in the mapping
    if (todoistToGoogle[task.id]) {
      var googleEventMap = todoistToGoogle[task.id];
      var googleEventId = googleEventMap.googleEventId;
      var todoistTaskMap = googleToTodoist[googleEventId];
      
      // Check whether title, description, or due_datetime has changed
      var titleChanged = task.content !== todoistTaskMap.title;
      var descriptionChanged = task.description !== todoistTaskMap.description;
      var dueDateTimeChanged = task.due.datetime !== todoistTaskMap.due_datetime;

      // If some of the metadata changed, update corresponding Calendar event and mappings
      if (titleChanged || descriptionChanged || dueDateTimeChanged) {     
        Logger.log('title changed changed: ' + titleChanged);
        Logger.log('description changed changed: ' + descriptionChanged);
        Logger.log('due_datetime changed: ' + dueDateTimeChanged);
        var title = task.content;
        var description = task.description;
        var due_datetime = task.due.datetime;

        // Update Google Calendar Event
        updateCalendarEvent(googleEventId, title, description, due_datetime);

        // Update both Mappings
        googleEventMap.title = title;
        googleEventMap.description = description;
        googleEventMap.due_datetime = due_datetime;
        todoistTaskMap.title = title;
        todoistTaskMap.description = description;
        todoistTaskMap.due_datetime = due_datetime;
      }

      processedTaskIds.add(task.id); // Mark task as processed
      Logger.log('Skipping TaskId: ' + task.id + ' -> EventId: ' + googleEventId + ' -> TaskId: ' + todoistTaskMap.todoistTaskId);
      return;

    } else {
      Logger.log('No existing Google Calendar event found for Todoist task ID: ' + task.id);
      var calendarEvent = createCalendarEventFromTodoistTask(task);

      // Update the mappings with both Todoist task ID and Google event ID
      googleToTodoist[calendarEvent.getId()] = {
        'todoistTaskId': task.id,
        'title': task.content
      };
      todoistToGoogle[task.id] = {
        'googleEventId': calendarEvent.getId(),
        'title': calendarEvent.getTitle()
      };

      processedTaskIds.add(task.id); // Mark task as processed
    }
  });

  // Remove entries from mappings where the Todoist task no longer exists
  for (var todoistTaskId in todoistToGoogle) {
    if (!processedTaskIds.has(todoistTaskId)) {
      var googleEventId = todoistToGoogle[todoistTaskId].googleEventId;
      Logger.log('Removing mapping for deleted Todoist task ID: ' + todoistTaskId + ' and corresponding Google event ID: ' + googleEventId);
      
      // Remove from both mappings
      delete googleToTodoist[googleEventId];
      delete todoistToGoogle[todoistTaskId];

      // Delete the Google Calendar event
      deleteCalendarEvent(googleEventId);
    }
  }

  // Store the updated mappings after all modifications
  PropertiesService.getScriptProperties().setProperty('GOOGLE_TO_TODOIST_PAIRS', JSON.stringify(googleToTodoist));
  PropertiesService.getScriptProperties().setProperty('TODOIST_TO_GOOGLE_PAIRS', JSON.stringify(todoistToGoogle));

  Logger.log('Todoist API: Completed checking and creating tasks.');
}


// Function to ping the Todoist API and get projects
function getTodoistProjects() {
  var url = 'https://api.todoist.com/rest/v2/projects';
  var options = {
    'method': 'get',
    'headers': {
      'Authorization': 'Bearer ' + TODOIST_API_TOKEN
    }
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var projects = JSON.parse(response.getContentText());
    Logger.log('Received projects: ' + JSON.stringify(projects))
    return projects;
  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}


// Function to retrieve all tasks from a specific Todoist project
function getTodoistTasks() {
  var url = 'https://api.todoist.com/rest/v2/tasks?project_id=' + TODOIST_PROJECT_ID_INBOX;
  var options = {
    'method': 'get',
    'headers': {
      'Authorization': 'Bearer ' + TODOIST_API_TOKEN
    }
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();

    if (responseCode === 200) {
      var tasks = JSON.parse(response.getContentText());
      return tasks;
    } else {
      Logger.log('Unexpected response code: ' + responseCode);
      Logger.log('Response content: ' + response.getContentText());
    }
  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}


function updateTodoistTask(todoistTaskId, updatedTitle, updatedDescription, updatedDueDateTime) {
  Logger.log('Updating Todoist task ID: ' + todoistTaskId);

  var url = 'https://api.todoist.com/rest/v2/tasks/' + todoistTaskId;
  
  // Prepare the updated task data
  var taskData = {
    'content': updatedTitle,
    'description': updatedDescription,
    'due_datetime': updatedDueDateTime,
  };

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + TODOIST_API_TOKEN
    },
    'payload': JSON.stringify(taskData)
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    if (responseCode === 200) {
      Logger.log('Task updated successfully. Task ID: ' + todoistTaskId);
      return;
    } else {
      Logger.log('Unexpected response code: ' + responseCode);
      Logger.log('Response content: ' + response.getContentText());
      return;
    }
  } catch (error) {
    Logger.log('Error updating task in Todoist: ' + error.message);
    return;
  }
}


function deleteTodoistTask(todoistTaskId) {
  Logger.log('Deleting Todoist task with ID: ' + todoistTaskId);

  var url = 'https://api.todoist.com/rest/v2/tasks/' + todoistTaskId;
  var options = {
    'method': 'delete',
    'headers': {
      'Authorization': 'Bearer ' + TODOIST_API_TOKEN
    }
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log('Todoist task deleted: ' + response.getResponseCode());
  } catch (error) {
    Logger.log('Error deleting Todoist task: ' + error.message);
  }
}


function createCalendarEventFromTodoistTask(task) {
  Logger.log('Creating Google Calendar event from Todoist task: ' + JSON.stringify(task));

  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  var taskDueDate = new Date(task.due.datetime);

  // Create a new calendar event with default length of 30 minutes
  var event = calendar.createEvent(
    task.content,
    taskDueDate,
    new Date(taskDueDate.getTime() + DEFAULT_TASK_DURATION_MIN * 60 * 1000),
    {
      description: task.description || ''
    }
  );

  Logger.log('Created Google Calendar event: ' + event.getId());
  return event;
}
