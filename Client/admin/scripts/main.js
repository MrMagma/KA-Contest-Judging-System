/*
 * Step 1: Check to make sure user is logged in (if not, leave page)
 * Step 2: Check to make sure logged in user, is an administrator (if not, leave page)
 * Step 3: Load all tools onto the page.
 * Step 4: [ ... ]
 */

var authChecksDone = false;

/* Check if user is logged in. We'll be using cookies to store whether or not the user is logged in (unfortunately). */
if (Contest_Judging_System.getCookie("loggedInUser") === "") {
	/* Let the user know that we're leaving the page. */
	alert("You don't appear to be logged in! Leaving page.");
	window.location.assign("../index.html");
} else {
	var fbRef = new Firebase("https://contest-judging-sys.firebaseio.com/users/");

	var userID = Contest_Judging_System.getCookie("loggedInUser");

	/* Query Firebase */
	fbRef.orderByKey().on("child_added", function(data) { /* Do nothing here. */ });

	/* Once the query is done... */
	fbRef.once("value", function(data) {
		/* ...make sure the user exists in Firebase. If they do... */
		if (!data.val().hasOwnProperty(userID)) {
			/* User doesn't exist in Firebase, which means they cannot be an admin. */
			/* Let the user know that we're leaving the page. */
			alert("User ID \"" + userID + "\" doesn't exist in Firebase. Leaving page.");
			window.location.assign("../index.html");
		} else {
			/* ...make sure they're an admin. */
			if (data.val()[userID].permLevel !== 5) {
				/* User doesn't appear to be an admin. */
				/* Let the user know that we're leaving the page. */
				alert("You do not have admin permissions! Leaving page.");
				window.location.assign("../index.html");
			}
		}
		/* Once everything is done, set authChecksDone to true, that way we can move to the next step. */
		authChecksDone = true;
	});
}

var authChecks = setInterval(function() {
	if (authChecksDone) {
		clearInterval(authChecks);
		console.log("Authenticated!");

		/* Do stuff here! */
	}
}, 1000);