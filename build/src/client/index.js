(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports = (function () {
    if (!window.jQuery || !window.Firebase) {
        return;
    }

    // The following variable is used to store our "Firebase Key"
    var FIREBASE_KEY = "https://contest-judging-sys.firebaseio.com";

    // The following variable is used to specify the default number of entries to fetch
    var DEF_NUM_ENTRIES_TO_LOAD = 10;

    // Error messages.
    var ERROR_MESSAGES = {
        ERR_NOT_JUDGE: "Error: You do not have permission to judge contest entries.",
        ERR_ALREADY_VOTED: "Error: You've already judged this entry."
    };

    return {
        reportError: function reportError(error) {
            console.error(error);
        },
        fetchFirebaseAuth: function fetchFirebaseAuth() {
            return new window.Firebase(FIREBASE_KEY).getAuth();
        },
        onceAuthed: function onceAuthed(callback) {
            new window.Firebase(FIREBASE_KEY).onAuth(callback, this.reportError);
        },
        /**
         * authenticate(logout)
         * If logout is false (or undefined), we redirect to a google login page.
         * If logout is true, we invoke Firebase's unauth method (to log the user out), and reload the page.
         * @author Gigabyte Giant (2015)
         * @param {Boolean} logout*: Should we log the user out? (Defaults to false)
         */
        authenticate: function authenticate() {
            var _this = this;

            var logout = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

            var firebaseRef = new window.Firebase(FIREBASE_KEY);

            if (!logout) {
                (function () {
                    var self = _this;

                    firebaseRef.authWithOAuthRedirect("google", function (err, authData) {
                        if (err) {
                            self.reportError(err);
                        } else {
                            var fbUsersRef = firebaseRef.child("users");

                            fbUsersRef.once("value", function (usersSnapshot) {
                                if (!usersSnapshot.hasChild(authData.uid)) {
                                    usersRef.child(authData.uid).set({
                                        name: authData.google.displayName,
                                        permLevel: 1
                                    }, self.reportError);

                                    console.log("Added new user to Firebase! Welcome to CJSKA \"" + authData.google.displayName + "\"!");
                                }
                            });
                        }
                    });
                })();
            } else {
                firebaseRef.unauth();

                window.location.reload();
            }
        },
        /**
         * getPermLevel()
         * Gets the perm level of the user that is currently logged in.
         * @author Gigabyte Giant (2015)
         * @param {Function} callback: The callback function to invoke once we've recieved the data.
         */
        getPermLevel: function getPermLevel(callback) {
            var authData = this.fetchFirebaseAuth();

            if (authData !== null) {
                var firebaseRef = new window.Firebase(FIREBASE_KEY);
                var thisUserChild = firebaseRef.child("users").child(authData.uid);

                thisUserChild.once("value", function (snapshot) {
                    callback(snapshot.val().permLevel);
                });
            } else {
                callback(1);
            }
        },
        /**
         * fetchContestEntry(contestId, entryId, callback, properties)
         * @author Gigabyte Giant (2015)
         * @param {String} contestId: The ID of the contest that the entry we want to load data for resides under
         * @param {String} entryId: The ID of the contest entry that we want to load data for
         * @param {Function} callback: The callback function to invoke once we've loaded all of the required data
         * @param {Array} properties*: A list of all the properties that you want to load from this contest entry
         */
        fetchContestEntry: function fetchContestEntry(contestId, entryId, callback, properties) {
            var _this2 = this;

            if (!callback || typeof callback !== "function") {
                return;
            }

            // Used to reference Firebase
            var firebaseRef = new window.Firebase(FIREBASE_KEY);

            // Firebase children
            var contestChild = firebaseRef.child("contests").child(contestId);
            var entryChild = contestChild.child("entries").child(entryId);

            var requiredProps = properties === undefined ? ["id", "name", "thumb"] : properties;

            var callbackData = {};

            var _loop = function (propInd) {
                var currProp = requiredProps[propInd];

                entryChild.child(currProp).once("value", function (snapshot) {
                    callbackData[currProp] = snapshot.val();

                    if (Object.keys(callbackData).length === requiredProps.length) {
                        callback(callbackData);
                    }
                }, _this2.reportError);
            };

            for (var propInd = 0; propInd < requiredProps.length; propInd++) {
                _loop(propInd);
            }
        },
        /**
         * fetchContest(contestId, callback, properties)
         * @author Gigabyte Giant (2015)
         * @param {String} contestId: The ID of the contest that you want to load data for
         * @param {Function} callback: The callback function to invoke once we've received the data.
         * @param {Array} properties*: A list of all the properties that you want to load from this contest.
         */
        fetchContest: function fetchContest(contestId, callback, properties) {
            var _this3 = this;

            if (!callback || typeof callback !== "function") {
                return;
            }

            // Used to reference Firebase
            var firebaseRef = new window.Firebase(FIREBASE_KEY);

            // Firebase children
            var contestChild = firebaseRef.child("contests").child(contestId);

            // Properties that we must have before can invoke our callback function
            var requiredProps = properties === undefined ? ["id", "name", "desc", "img", "entryCount"] : properties;

            // The object that we pass into our callback function
            var callbackData = {};

            var _loop2 = function (propInd) {
                var currProp = requiredProps[propInd];

                contestChild.child(currProp).once("value", function (snapshot) {
                    callbackData[currProp] = snapshot.val();

                    if (Object.keys(callbackData).length === requiredProps.length) {
                        callback(callbackData);
                    }
                }, _this3.reportError);
            };

            for (var propInd = 0; propInd < requiredProps.length; propInd++) {
                _loop2(propInd);
            }
        },
        /**
         * fetchContests(callback)
         * Fetches all contests that're being stored in Firebase, and passes them into a callback function.
         * @author Gigabyte Giant (2015)
         * @param {Function} callback: The callback function to invoke once we've captured all the data that we need.
         * @todo (Gigabyte Giant): Add better comments!
         */
        fetchContests: function fetchContests(callback) {
            if (!callback || typeof callback !== "function") {
                return;
            }

            // Used to reference Firebase
            var firebaseRef = new window.Firebase(FIREBASE_KEY);

            // Firebase children
            var contestKeysChild = firebaseRef.child("contestKeys");
            var contestsChild = firebaseRef.child("contests");

            // Properties that we must have before we can invoke our callback function
            var requiredProps = ["id", "name", "desc", "img", "entryCount"];

            // keysWeFound holds a list of all of the contest keys that we've found so far
            var keysWeFound = [];

            // callbackData is the object that gets passed into our callback function
            var callbackData = {};

            // "Query" our contestKeysChild
            contestKeysChild.orderByKey().on("child_added", function (fbItem) {
                // Add the current key to our "keysWeFound" array
                keysWeFound.push(fbItem.key());

                var thisContest = contestsChild.child(fbItem.key());

                var thisContestData = {};

                var _loop3 = function (propInd) {
                    var currProperty = requiredProps[propInd];
                    thisContest.child(currProperty).once("value", function (fbSnapshot) {
                        thisContestData[currProperty] = fbSnapshot.val();

                        // TODO (Gigabyte Giant): Get rid of all this nested "crap"
                        if (Object.keys(thisContestData).length === requiredProps.length) {
                            callbackData[fbItem.key()] = thisContestData;

                            if (Object.keys(callbackData).length === keysWeFound.length) {
                                callback(callbackData);
                            }
                        }
                    });
                };

                for (var propInd = 0; propInd < requiredProps.length; propInd++) {
                    _loop3(propInd);
                }
            }, this.reportError);
        },
        /**
         * fetchContestEntries(contestId, callback)
         *
         * @author Gigabyte Giant (2015)
         * @param {String} contestId: The Khan Academy scratchpad ID of the contest that we want to fetch entries for.
         * @param {Function} callback: The callback function to invoke after we've fetched all the data that we need.
         * @param {Integer} loadHowMany*: The number of entries to load. If no value is passed to this parameter,
         *  fallback onto a default value.
         */
        fetchContestEntries: function fetchContestEntries(contestId, callback) {
            var loadHowMany = arguments.length <= 2 || arguments[2] === undefined ? DEF_NUM_ENTRIES_TO_LOAD : arguments[2];
            var includeJudged = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

            // If we don't have a valid callback function, exit the function.
            if (!callback || typeof callback !== "function") {
                return;
            }

            // Used to reference Firebase
            var firebaseRef = new window.Firebase(FIREBASE_KEY);

            // References to Firebase children
            var thisContestRef = firebaseRef.child("contests").child(contestId);
            var contestEntriesRef = thisContestRef.child("entries");

            // Used to keep track of how many entries we've loaded
            var numLoaded = 0;

            // Used to store each of the entries that we've loaded
            var entryKeys = [];

            var alreadyChecked = [];

            var self = this;

            contestEntriesRef.once("value", function (fbSnapshot) {
                var tmpEntryKeys = Object.keys(fbSnapshot.val());

                if (tmpEntryKeys.length < loadHowMany) {
                    loadHowMany = tmpEntryKeys.length;
                }

                while (numLoaded < loadHowMany) {
                    var randomIndex = Math.floor(Math.random() * tmpEntryKeys.length);
                    var selectedKey = tmpEntryKeys[randomIndex];

                    if (entryKeys.indexOf(selectedKey) === -1 && (!fbSnapshot.val()[selectedKey].hasOwnProperty("archived") || fbSnapshot.val()[selectedKey].archived === false)) {
                        if (fbSnapshot.val()[selectedKey].hasOwnProperty("scores") && !includeJudged) {
                            if (!fbSnapshot.val()[selectedKey].scores.rubric.hasOwnProperty("judgesWhoVoted") || fbSnapshot.val()[selectedKey].scores.rubric.judgesWhoVoted.indexOf(self.fetchFirebaseAuth().uid) === -1) {
                                entryKeys.push(selectedKey);
                                numLoaded++;
                            } else {
                                if (alreadyChecked.indexOf(selectedKey) === -1) {
                                    console.log("Already judged " + selectedKey);
                                    alreadyChecked.push(selectedKey);
                                } else {
                                    loadHowMany--;
                                }
                            }
                        } else {
                            entryKeys.push(selectedKey);
                            numLoaded++;
                        }
                    }
                }
            });

            var callbackWait = setInterval(function () {
                if (numLoaded === loadHowMany) {
                    clearInterval(callbackWait);
                    callback(entryKeys);
                }
            }, 1000);
        },
        /**
         * loadContestEntry(contestId, entryId, callback)
         * Loads a contest entry (which is specified via providing a contest id and an entry id).
         * @author Gigabyte Giant (2015)
         * @param {String} contestId: The scratchpad ID of the contest that this entry resides under.
         * @param {String} entryId: The scratchpad ID of the entry.
         * @param {Function} callback: The callback function to invoke once we've loaded all the required data.
         * @todo (Gigabyte Giant): Add authentication to this function
         */
        loadContestEntry: function loadContestEntry(contestId, entryId, callback) {
            // If we don't have a valid callback function, exit the function.
            if (!callback || typeof callback !== "function") {
                return;
            }

            // Used to reference Firebase
            var firebaseRef = new window.Firebase(FIREBASE_KEY);

            // References to Firebase children
            var contestRef = firebaseRef.child("contests").child(contestId);
            var entriesRef = contestRef.child("entries").child(entryId);

            var self = this;

            this.getPermLevel(function (permLevel) {
                // A variable containing a list of all the properties that we must load before we can invoke our callback function
                var requiredProps = ["id", "name", "thumb"];

                if (permLevel >= 5) {
                    requiredProps.push("scores");
                }

                // The JSON object that we'll pass into the callback function
                var callbackData = {};

                var _loop4 = function (i) {
                    var propRef = entriesRef.child(requiredProps[i]);

                    propRef.once("value", function (snapshot) {
                        callbackData[requiredProps[i]] = snapshot.val();

                        if (Object.keys(callbackData).length === requiredProps.length) {
                            callback(callbackData);
                        }
                    }, self.reportError);
                };

                for (var i = 0; i < requiredProps.length; i++) {
                    _loop4(i);
                }
            });
        },
        /**
         * loadXContestEntries(contestId, callback, loadHowMany)
         * Loads "x" contest entries, and passes them into a callback function.
         * @author Gigabyte Giant (2015)
         * @param {String} contestId: The scratchpad ID of the contest that we want to load entries from.
         * @param {Function} callback: The callback function to invoke once we've loaded all the required data.
         * @param {Integer} loadHowMany: The number of entries that we'd like to load.
         */
        loadXContestEntries: function loadXContestEntries(contestId, callback, loadHowMany) {
            var includeJudged = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

            var callbackData = {};

            var self = this;

            this.fetchContestEntries(contestId, function (response) {
                var _loop5 = function (eInd) {
                    self.loadContestEntry(contestId, response[eInd], function (entryData) {
                        callbackData[response[eInd]] = entryData;

                        if (Object.keys(callbackData).length === response.length) {
                            callback(callbackData);
                        }
                    });
                };

                for (var eInd = 0; eInd < response.length; eInd++) {
                    _loop5(eInd);
                }
            }, loadHowMany, includeJudged);
        },
        /**
         * getDefaultRubrics(callback)
         * @author Gigabyte Giant (2015)
         * @param {Function} callback: The callback function to invoke once we've loaded all the default rubrics
         */
        getDefaultRubrics: function getDefaultRubrics(callback) {
            var firebaseRef = new window.Firebase(FIREBASE_KEY);
            var rubricsChild = firebaseRef.child("rubrics");

            rubricsChild.once("value", function (snapshot) {
                callback(snapshot.val());
            });
        },
        /**
         * getContestRubrics(contestId, callback)
         * @author Gigabyte Giant (2015)
         * @param {String} contestId: The ID of the contest that we want to load the rubrics for
         * @param {Function} callback: The callback function to invoke once we've loaded all of the rubrics
         */
        getContestRubrics: function getContestRubrics(contestId, callback) {
            var callbackData = {};

            var self = this;

            this.getDefaultRubrics(function (defaultRubrics) {
                callbackData = defaultRubrics;
                self.fetchContest(contestId, function (contestRubrics) {
                    var customRubrics = contestRubrics.rubrics;

                    if (customRubrics !== null) {
                        for (var customRubric in customRubrics) {
                            if (!callbackData.hasOwnProperty(customRubric)) {
                                callbackData[customRubric] = customRubrics[customRubric];
                            }
                        }

                        if (customRubrics.hasOwnProperty("Order")) {
                            for (var oInd = 0; oInd < customRubrics.Order.length; oInd++) {
                                // Make sure the current rubric item is actually a valid rubric item, and make sure it's not the "Order" item.
                                if (customRubrics.hasOwnProperty(customRubrics.Order[oInd]) && customRubrics.Order[oInd] !== "Order") {
                                    var thisRubric = customRubrics.Order[oInd];

                                    if (callbackData.Order.indexOf(thisRubric) === -1) {
                                        callbackData.Order.push(thisRubric);
                                    }
                                }
                            }
                        } else {
                            customRubrics.Order = [];
                        }
                    }

                    callback(callbackData);
                }, ["rubrics"]);
            });
        },
        /**
         * judgeEntry(contestId, entryId, scoreData, callback)
         * @author Gigabyte Giant (2015)
         * @param {String} contestId: The ID of the contest that we're judging an entry for
         * @param {String} entryId: The ID of the entry that we're judging
         * @param {Object} scoreData: The scoring data
         * @param {Function} callback: The callback function to invoke after we've validated the scores, and submitted them.
         */
        judgeEntry: function judgeEntry(contestId, entryId, scoreData, callback) {
            // 0: Check the users perm level, if their permLevel isn't >= 4, exit.
            // 1: Fetch the rubrics for the current contest, to make sure we're not doing anything funky
            // 2: Validate the data that was submitted to the function
            // 3: Submit the data to Firebase

            var self = this;

            this.getPermLevel(function (permLevel) {
                if (permLevel >= 4) {
                    (function () {
                        var thisJudge = self.fetchFirebaseAuth().uid;

                        self.getContestRubrics(contestId, function (contestRubrics) {
                            contestRubrics.judgesWhoVoted = contestRubrics.judgesWhoVoted === undefined ? [] : contestRubrics.judgesWhoVoted;

                            if (contestRubrics.hasOwnProperty("judgesWhoVoted")) {
                                if (contestRubrics.judgesWhoVoted.indexOf(thisJudge) !== -1) {
                                    callback(ERROR_MESSAGES.ERR_ALREADY_VOTED);
                                }
                            }

                            var thisJudgesVote = {};

                            for (var score in scoreData) {
                                if (contestRubrics.hasOwnProperty(score)) {
                                    var scoreVal = -1;

                                    if (scoreData[score] > contestRubrics[score].max) {
                                        scoreVal = contestRubrics[score].max;
                                    } else if (scoreData[score] < contestRubrics[score].min) {
                                        scoreVal = contestRubrics[score].min;
                                    } else {
                                        scoreVal = scoreData[score];
                                    }

                                    thisJudgesVote[score] = scoreVal;
                                }
                            }

                            console.log(thisJudgesVote);

                            self.fetchContestEntry(contestId, entryId, function (existingScoreData) {
                                existingScoreData = existingScoreData.scores;

                                contestRubrics.judgesWhoVoted.push(thisJudge);

                                var dataToWrite = {
                                    judgesWhoVoted: contestRubrics.judgesWhoVoted
                                };

                                if (existingScoreData.hasOwnProperty("rubric")) {
                                    var existingRubricItemScores = existingScoreData.rubric;

                                    var rubricItems = contestRubrics;

                                    for (var rubricItem in rubricItems) {
                                        if (thisJudgesVote.hasOwnProperty(rubricItem)) {
                                            console.log("The item: " + rubricItem);

                                            var tmpScoreObj = {
                                                avg: existingRubricItemScores[rubricItem] === undefined ? 1 : existingRubricItemScores[rubricItem].avg,
                                                rough: existingRubricItemScores[rubricItem] === undefined ? 1 : existingRubricItemScores[rubricItem].rough
                                            };

                                            if (dataToWrite.judgesWhoVoted.length - 1 === 0) {
                                                tmpScoreObj.rough = 1;
                                                tmpScoreObj.avg = 1;
                                            }

                                            tmpScoreObj.rough = tmpScoreObj.rough + thisJudgesVote[rubricItem];
                                            tmpScoreObj.avg = tmpScoreObj.rough / contestRubrics.judgesWhoVoted.length;

                                            dataToWrite[rubricItem] = tmpScoreObj;
                                        }
                                    }
                                }

                                console.log(dataToWrite);

                                var fbRef = new window.Firebase(FIREBASE_KEY).child("contests").child(contestId).child("entries").child(entryId).child("scores").child("rubric");

                                fbRef.set(dataToWrite, function (error) {
                                    if (error) {
                                        self.reportError(error);
                                        return;
                                    }

                                    callback();
                                });
                            }, ["scores"]);
                        });
                    })();
                } else {
                    callback(ERROR_MESSAGES.ERR_NOT_JUDGE);
                }
            });
        }
    };
})();

},{}],2:[function(require,module,exports){
"use strict";

var CJS = require("../backend/contest_judging_sys.js");
var helpers = require("../helpers/helpers.js");

/**
 * createContestControl(controlData)
 * Creates a button using the data specified, and returns it to the caller.
 * @author Gigabyte Giant (2015)
 * @contributors Darryl Yeo (2015)
 * @param {Object} controlData: The JSON object containing the data for the control (such as display text and where the control should link to)
 * @returns {jQuery} contestControl: The jQuery object containing the newly created contest control
 */
var createContestControl = function createContestControl(controlData) {
    return $("<a>").addClass("waves-effect waves-light amber darken-2 btn contest-control").text(controlData.text).attr("href", controlData.link === undefined ? null : controlData.link);
};

/**
 * createContestDetails(contestData)
 * Creates a "contest details" div, and returns it to the caller.
 * @author Gigabyte Giant (2015)
 * @contributors Darryl Yeo (2015)
 * @param {Object} contestData: A JSON object containing the data for a contest.
 * @returns {jQuery} contestDetails: The jQuery object containing the "contest details" div.
 */
var createContestDetails = function createContestDetails(contestData) {
    return $("<div>").addClass("col s12 m9").append($("<h5>").addClass("title").text(contestData.title)).append($("<div>").addClass("description").html(contestData.description));
};

/**
 * createContestHolder(contestData)
 * Creates a "contest holder" div, and returns it to the caller.
 * @author Gigabyte Giant (2015)
 * @contributors Darryl Yeo (2015)
 * @param {Object} contestData: A JSON object containing the data for a contest.
 * @returns {jQuery} contestHolder: The jQuery object containing the "contest holder" div.
 */
var createContestHolder = function createContestHolder(contestData) {
    var contestHolder = $("<div>").addClass("contest section").attr("id", contestData.id).append(createContestDetails(contestData)).append($("<div>").addClass("col s12 m3").append($("<div>").addClass("center").append($("<img>").attr("src", contestData.thumbnail).addClass("img-responsive contest-thumbnail")).append(createContestControl({
        text: "View Entries",
        link: "contest.html?contest=" + contestData.id + "&count=32"
    }))));

    CJS.getPermLevel(function (permLevel) {
        if (permLevel >= 5) {
            $("#" + contestData.id + " .center").append(createContestControl({
                text: "View Leaderboard",
                link: "leaderboard.html?contest=" + contestData.id
            }));
        }
    });

    return contestHolder;
};

var setupPage = function setupPage(contestData) {
    for (var cid in contestData) {
        var contest = contestData[cid];

        $("#contests").append($("<div>").addClass("row").append(createContestHolder({
            id: contest.id,
            title: contest.name,
            description: contest.desc === "" ? "No description provided." : contest.desc,
            thumbnail: "https://www.khanacademy.org/" + contest.img
        }))).append($("<div>").addClass("divider"));
    }
};

helpers.authentication.setupPageAuth("#authBtn", CJS);
CJS.fetchContests(setupPage);

// $("#authBtn").on("click", function(evt) {
//     evt.preventDefault();

//     if (fbAuth === null) {
//         CJS.authenticate();
//     } else {
//         CJS.authenticate(true);
//     }
// });

},{"../backend/contest_judging_sys.js":1,"../helpers/helpers.js":5}],3:[function(require,module,exports){
"use strict";

module.exports = {
    addAdminLink: function addAdminLink(selector, cjsWrapper) {
        cjsWrapper.getPermLevel(function (permLevel) {
            if (permLevel >= 5) {
                $("<li>").addClass("active").append($("<a>").attr("href", "./admin/").text("Admin dashboard")).insertBefore($(selector).parent());
            }
        });
    },
    setupOnClick: function setupOnClick(selector, cjsWrapper) {
        $(selector).on("click", function (evt) {
            evt.preventDefault();

            if (cjsWrapper.fetchFirebaseAuth() === null) {
                cjsWrapper.authenticate();
            } else {
                cjsWrapper.authenticate(true);
            }
        });
    },
    showWelcome: function showWelcome(selector, cjsWrapper) {
        if (cjsWrapper.fetchFirebaseAuth() === null) {
            $(selector).text("Hello guest! Click me to log in.");
        } else {
            $(selector).text("Hello " + cjsWrapper.fetchFirebaseAuth().google.displayName + "! (Not you? Click here!)");
        }
    },
    setupPageAuth: function setupPageAuth(authBtnSelector, cjsWrapper) {
        this.setupOnClick(authBtnSelector, cjsWrapper);
        this.showWelcome(authBtnSelector, cjsWrapper);
        // this.addAdminLink(authBtnSelector, cjsWrapper);
    }
};

},{}],4:[function(require,module,exports){
"use strict";

module.exports = {
    /**
     * getCookie(cookieName)
     * Fetches the specified cookie from the browser, and returns it's value.
     * @author w3schools
     * @param {String} cookieName: The name of the cookie that we want to fetch.
     * @returns {String} cookieValue: The value of the specified cookie, or an empty string, if there is no "non-falsy" value.
     */
    getCookie: function getCookie(cookieName) {
        // Get the cookie with name cookie (return "" if non-existent)
        cookieName = cookieName + "=";
        // Check all of the cookies and try to find the one containing name.
        var cookieList = document.cookie.split(";");
        for (var cInd = 0; cInd < cookieList.length; cInd++) {
            var curCookie = cookieList[cInd];
            while (curCookie[0] === " ") {
                curCookie = curCookie.substring(1);
            }
            // If we've found the right cookie, return its value.
            if (curCookie.indexOf(cookieName) === 0) {
                return curCookie.substring(cookieName.length, curCookie.length);
            }
        }
        // Otherwise, if the cookie doesn't exist, return ""
        return "";
    },
    /**
     * setCookie(cookieName, value)
     * Creates/updates a cookie with the desired name, setting it's value to "value".
     * @author w3schools
     * @param {String} cookieName: The name of the cookie that we want to create/update.
     * @param {String} value: The value to assign to the cookie.
     */
    setCookie: function setCookie(cookieName, value) {
        // Set a cookie with name cookie and value cookie that will expire 30 days from now.
        var d = new Date();
        d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000);
        var expires = "expires=" + d.toUTCString();
        document.cookie = cookieName + "=" + value + "; " + expires;
    },
    /**
     * getUrlParams()
     * @author Gigabyte Giant (2015)
     * @param {String} url: The URL to fetch URL parameters from
     */
    getUrlParams: function getUrlParams(url) {
        var urlParams = {};

        var splitUrl = url.split("?")[1];

        if (splitUrl !== undefined) {
            var tmpUrlParams = splitUrl.split("&");

            for (var upInd = 0; upInd < tmpUrlParams.length; upInd++) {
                var currParamStr = tmpUrlParams[upInd];

                urlParams[currParamStr.split("=")[0]] = currParamStr.split("=")[1].replace(/\#\!/g, "");
            }
        }

        return urlParams;
    }
};

},{}],5:[function(require,module,exports){
"use strict";

module.exports = {
    authentication: require("./authentication.js"),
    general: require("./general.js")
};

},{"./authentication.js":3,"./general.js":4}]},{},[2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvQnJ5bmRlbi9zcGFyay9Db250ZXN0LUp1ZGdpbmctU3lzdGVtLWZvci1LQS9zcmMvYmFja2VuZC9jb250ZXN0X2p1ZGdpbmdfc3lzLmpzIiwiL1VzZXJzL0JyeW5kZW4vc3BhcmsvQ29udGVzdC1KdWRnaW5nLVN5c3RlbS1mb3ItS0Evc3JjL2NsaWVudC9pbmRleC5qcyIsIi9Vc2Vycy9CcnluZGVuL3NwYXJrL0NvbnRlc3QtSnVkZ2luZy1TeXN0ZW0tZm9yLUtBL3NyYy9oZWxwZXJzL2F1dGhlbnRpY2F0aW9uLmpzIiwiL1VzZXJzL0JyeW5kZW4vc3BhcmsvQ29udGVzdC1KdWRnaW5nLVN5c3RlbS1mb3ItS0Evc3JjL2hlbHBlcnMvZ2VuZXJhbC5qcyIsIi9Vc2Vycy9CcnluZGVuL3NwYXJrL0NvbnRlc3QtSnVkZ2luZy1TeXN0ZW0tZm9yLUtBL3NyYy9oZWxwZXJzL2hlbHBlcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxZQUFXO0FBQ3pCLFFBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtBQUNwQyxlQUFPO0tBQ1Y7OztBQUdELFFBQUksWUFBWSxHQUFHLDRDQUE0QyxDQUFDOzs7QUFHaEUsUUFBSSx1QkFBdUIsR0FBRyxFQUFFLENBQUM7OztBQUdqQyxRQUFJLGNBQWMsR0FBRztBQUNqQixxQkFBYSxFQUFFLDZEQUE2RDtBQUM1RSx5QkFBaUIsRUFBRSwwQ0FBMEM7S0FDaEUsQ0FBQzs7QUFFRixXQUFPO0FBQ0gsbUJBQVcsRUFBRSxxQkFBUyxLQUFLLEVBQUU7QUFDekIsbUJBQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEI7QUFDRCx5QkFBaUIsRUFBRSw2QkFBVztBQUMxQixt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QUFDLEVBQUUsS0FBSyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7QUFDdEQsb0JBQUksWUFBWSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFdkMseUJBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDN0QsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQzthQUM3QjtTQUNKOztBQUVELGVBQU8sU0FBUyxDQUFDO0tBQ3BCO0NBQ0osQ0FBQzs7Ozs7QUMvREYsTUFBTSxDQUFDLE9BQU8sR0FBRztBQUNiLGtCQUFjLEVBQUUsT0FBTyxDQUFDLHFCQUFxQixDQUFDO0FBQzlDLFdBQU8sRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDO0NBQ25DLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF3aW5kb3cualF1ZXJ5IHx8ICF3aW5kb3cuRmlyZWJhc2UpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoZSBmb2xsb3dpbmcgdmFyaWFibGUgaXMgdXNlZCB0byBzdG9yZSBvdXIgXCJGaXJlYmFzZSBLZXlcIlxuICAgIGxldCBGSVJFQkFTRV9LRVkgPSBcImh0dHBzOi8vY29udGVzdC1qdWRnaW5nLXN5cy5maXJlYmFzZWlvLmNvbVwiO1xuXG4gICAgLy8gVGhlIGZvbGxvd2luZyB2YXJpYWJsZSBpcyB1c2VkIHRvIHNwZWNpZnkgdGhlIGRlZmF1bHQgbnVtYmVyIG9mIGVudHJpZXMgdG8gZmV0Y2hcbiAgICBsZXQgREVGX05VTV9FTlRSSUVTX1RPX0xPQUQgPSAxMDtcblxuICAgIC8vIEVycm9yIG1lc3NhZ2VzLlxuICAgIGxldCBFUlJPUl9NRVNTQUdFUyA9IHtcbiAgICAgICAgRVJSX05PVF9KVURHRTogXCJFcnJvcjogWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8ganVkZ2UgY29udGVzdCBlbnRyaWVzLlwiLFxuICAgICAgICBFUlJfQUxSRUFEWV9WT1RFRDogXCJFcnJvcjogWW91J3ZlIGFscmVhZHkganVkZ2VkIHRoaXMgZW50cnkuXCJcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVwb3J0RXJyb3I6IGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmV0Y2hGaXJlYmFzZUF1dGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIChuZXcgd2luZG93LkZpcmViYXNlKEZJUkVCQVNFX0tFWSkpLmdldEF1dGgoKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25jZUF1dGhlZDogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIChuZXcgd2luZG93LkZpcmViYXNlKEZJUkVCQVNFX0tFWSkpLm9uQXV0aChjYWxsYmFjaywgdGhpcy5yZXBvcnRFcnJvcik7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBhdXRoZW50aWNhdGUobG9nb3V0KVxuICAgICAgICAgKiBJZiBsb2dvdXQgaXMgZmFsc2UgKG9yIHVuZGVmaW5lZCksIHdlIHJlZGlyZWN0IHRvIGEgZ29vZ2xlIGxvZ2luIHBhZ2UuXG4gICAgICAgICAqIElmIGxvZ291dCBpcyB0cnVlLCB3ZSBpbnZva2UgRmlyZWJhc2UncyB1bmF1dGggbWV0aG9kICh0byBsb2cgdGhlIHVzZXIgb3V0KSwgYW5kIHJlbG9hZCB0aGUgcGFnZS5cbiAgICAgICAgICogQGF1dGhvciBHaWdhYnl0ZSBHaWFudCAoMjAxNSlcbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBsb2dvdXQqOiBTaG91bGQgd2UgbG9nIHRoZSB1c2VyIG91dD8gKERlZmF1bHRzIHRvIGZhbHNlKVxuICAgICAgICAgKi9cbiAgICAgICAgYXV0aGVudGljYXRlOiBmdW5jdGlvbihsb2dvdXQgPSBmYWxzZSkge1xuICAgICAgICAgICAgbGV0IGZpcmViYXNlUmVmID0gKG5ldyB3aW5kb3cuRmlyZWJhc2UoRklSRUJBU0VfS0VZKSk7XG5cbiAgICAgICAgICAgIGlmICghbG9nb3V0KSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICAgICAgICAgZmlyZWJhc2VSZWYuYXV0aFdpdGhPQXV0aFJlZGlyZWN0KFwiZ29vZ2xlXCIsIGZ1bmN0aW9uKGVyciwgYXV0aERhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZXBvcnRFcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZiVXNlcnNSZWYgPSBmaXJlYmFzZVJlZi5jaGlsZChcInVzZXJzXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmYlVzZXJzUmVmLm9uY2UoXCJ2YWx1ZVwiLCBmdW5jdGlvbih1c2Vyc1NuYXBzaG90KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF1c2Vyc1NuYXBzaG90Lmhhc0NoaWxkKGF1dGhEYXRhLnVpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcnNSZWYuY2hpbGQoYXV0aERhdGEudWlkKS5zZXQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYXV0aERhdGEuZ29vZ2xlLmRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVybUxldmVsOiAxXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIHNlbGYucmVwb3J0RXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQWRkZWQgbmV3IHVzZXIgdG8gRmlyZWJhc2UhIFdlbGNvbWUgdG8gQ0pTS0EgXFxcIlwiICsgYXV0aERhdGEuZ29vZ2xlLmRpc3BsYXlOYW1lICsgXCJcXFwiIVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZVJlZi51bmF1dGgoKTtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGdldFBlcm1MZXZlbCgpXG4gICAgICAgICAqIEdldHMgdGhlIHBlcm0gbGV2ZWwgb2YgdGhlIHVzZXIgdGhhdCBpcyBjdXJyZW50bHkgbG9nZ2VkIGluLlxuICAgICAgICAgKiBAYXV0aG9yIEdpZ2FieXRlIEdpYW50ICgyMDE1KVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjazogVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZSBvbmNlIHdlJ3ZlIHJlY2lldmVkIHRoZSBkYXRhLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0UGVybUxldmVsOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgbGV0IGF1dGhEYXRhID0gdGhpcy5mZXRjaEZpcmViYXNlQXV0aCgpO1xuXG4gICAgICAgICAgICBpZiAoYXV0aERhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBsZXQgZmlyZWJhc2VSZWYgPSAobmV3IHdpbmRvdy5GaXJlYmFzZShGSVJFQkFTRV9LRVkpKTtcbiAgICAgICAgICAgICAgICBsZXQgdGhpc1VzZXJDaGlsZCA9IGZpcmViYXNlUmVmLmNoaWxkKFwidXNlcnNcIikuY2hpbGQoYXV0aERhdGEudWlkKTtcblxuICAgICAgICAgICAgICAgIHRoaXNVc2VyQ2hpbGQub25jZShcInZhbHVlXCIsIGZ1bmN0aW9uKHNuYXBzaG90KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHNuYXBzaG90LnZhbCgpLnBlcm1MZXZlbCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogZmV0Y2hDb250ZXN0RW50cnkoY29udGVzdElkLCBlbnRyeUlkLCBjYWxsYmFjaywgcHJvcGVydGllcylcbiAgICAgICAgICogQGF1dGhvciBHaWdhYnl0ZSBHaWFudCAoMjAxNSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlc3RJZDogVGhlIElEIG9mIHRoZSBjb250ZXN0IHRoYXQgdGhlIGVudHJ5IHdlIHdhbnQgdG8gbG9hZCBkYXRhIGZvciByZXNpZGVzIHVuZGVyXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlbnRyeUlkOiBUaGUgSUQgb2YgdGhlIGNvbnRlc3QgZW50cnkgdGhhdCB3ZSB3YW50IHRvIGxvYWQgZGF0YSBmb3JcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2s6IFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBpbnZva2Ugb25jZSB3ZSd2ZSBsb2FkZWQgYWxsIG9mIHRoZSByZXF1aXJlZCBkYXRhXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHByb3BlcnRpZXMqOiBBIGxpc3Qgb2YgYWxsIHRoZSBwcm9wZXJ0aWVzIHRoYXQgeW91IHdhbnQgdG8gbG9hZCBmcm9tIHRoaXMgY29udGVzdCBlbnRyeVxuICAgICAgICAgKi9cbiAgICAgICAgZmV0Y2hDb250ZXN0RW50cnk6IGZ1bmN0aW9uKGNvbnRlc3RJZCwgZW50cnlJZCwgY2FsbGJhY2ssIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGlmICghY2FsbGJhY2sgfHwgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNlZCB0byByZWZlcmVuY2UgRmlyZWJhc2VcbiAgICAgICAgICAgIGxldCBmaXJlYmFzZVJlZiA9IChuZXcgd2luZG93LkZpcmViYXNlKEZJUkVCQVNFX0tFWSkpO1xuXG4gICAgICAgICAgICAvLyBGaXJlYmFzZSBjaGlsZHJlblxuICAgICAgICAgICAgbGV0IGNvbnRlc3RDaGlsZCA9IGZpcmViYXNlUmVmLmNoaWxkKFwiY29udGVzdHNcIikuY2hpbGQoY29udGVzdElkKTtcbiAgICAgICAgICAgIGxldCBlbnRyeUNoaWxkID0gY29udGVzdENoaWxkLmNoaWxkKFwiZW50cmllc1wiKS5jaGlsZChlbnRyeUlkKTtcblxuICAgICAgICAgICAgbGV0IHJlcXVpcmVkUHJvcHMgPSAocHJvcGVydGllcyA9PT0gdW5kZWZpbmVkID8gW1wiaWRcIiwgXCJuYW1lXCIsIFwidGh1bWJcIl0gOiBwcm9wZXJ0aWVzKTtcblxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrRGF0YSA9IHt9O1xuXG4gICAgICAgICAgICBmb3IgKGxldCBwcm9wSW5kID0gMDsgcHJvcEluZCA8IHJlcXVpcmVkUHJvcHMubGVuZ3RoOyBwcm9wSW5kKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgY3VyclByb3AgPSByZXF1aXJlZFByb3BzW3Byb3BJbmRdO1xuXG4gICAgICAgICAgICAgICAgZW50cnlDaGlsZC5jaGlsZChjdXJyUHJvcCkub25jZShcInZhbHVlXCIsIGZ1bmN0aW9uKHNuYXBzaG90KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrRGF0YVtjdXJyUHJvcF0gPSBzbmFwc2hvdC52YWwoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMoY2FsbGJhY2tEYXRhKS5sZW5ndGggPT09IHJlcXVpcmVkUHJvcHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhjYWxsYmFja0RhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgdGhpcy5yZXBvcnRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmZXRjaENvbnRlc3QoY29udGVzdElkLCBjYWxsYmFjaywgcHJvcGVydGllcylcbiAgICAgICAgICogQGF1dGhvciBHaWdhYnl0ZSBHaWFudCAoMjAxNSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlc3RJZDogVGhlIElEIG9mIHRoZSBjb250ZXN0IHRoYXQgeW91IHdhbnQgdG8gbG9hZCBkYXRhIGZvclxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjazogVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZSBvbmNlIHdlJ3ZlIHJlY2VpdmVkIHRoZSBkYXRhLlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBwcm9wZXJ0aWVzKjogQSBsaXN0IG9mIGFsbCB0aGUgcHJvcGVydGllcyB0aGF0IHlvdSB3YW50IHRvIGxvYWQgZnJvbSB0aGlzIGNvbnRlc3QuXG4gICAgICAgICAqL1xuICAgICAgICBmZXRjaENvbnRlc3Q6IGZ1bmN0aW9uKGNvbnRlc3RJZCwgY2FsbGJhY2ssIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGlmICghY2FsbGJhY2sgfHwgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNlZCB0byByZWZlcmVuY2UgRmlyZWJhc2VcbiAgICAgICAgICAgIGxldCBmaXJlYmFzZVJlZiA9IChuZXcgd2luZG93LkZpcmViYXNlKEZJUkVCQVNFX0tFWSkpO1xuXG4gICAgICAgICAgICAvLyBGaXJlYmFzZSBjaGlsZHJlblxuICAgICAgICAgICAgbGV0IGNvbnRlc3RDaGlsZCA9IGZpcmViYXNlUmVmLmNoaWxkKFwiY29udGVzdHNcIikuY2hpbGQoY29udGVzdElkKTtcblxuICAgICAgICAgICAgLy8gUHJvcGVydGllcyB0aGF0IHdlIG11c3QgaGF2ZSBiZWZvcmUgY2FuIGludm9rZSBvdXIgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgICAgIGxldCByZXF1aXJlZFByb3BzID0gKHByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCA/IFtcImlkXCIsIFwibmFtZVwiLCBcImRlc2NcIiwgXCJpbWdcIiwgXCJlbnRyeUNvdW50XCJdIDogcHJvcGVydGllcyk7XG5cbiAgICAgICAgICAgIC8vIFRoZSBvYmplY3QgdGhhdCB3ZSBwYXNzIGludG8gb3VyIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgICAgICB2YXIgY2FsbGJhY2tEYXRhID0ge307XG5cbiAgICAgICAgICAgIGZvciAobGV0IHByb3BJbmQgPSAwOyBwcm9wSW5kIDwgcmVxdWlyZWRQcm9wcy5sZW5ndGg7IHByb3BJbmQrKykge1xuICAgICAgICAgICAgICAgIGxldCBjdXJyUHJvcCA9IHJlcXVpcmVkUHJvcHNbcHJvcEluZF07XG5cbiAgICAgICAgICAgICAgICBjb250ZXN0Q2hpbGQuY2hpbGQoY3VyclByb3ApLm9uY2UoXCJ2YWx1ZVwiLCBmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0RhdGFbY3VyclByb3BdID0gc25hcHNob3QudmFsKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKGNhbGxiYWNrRGF0YSkubGVuZ3RoID09PSByZXF1aXJlZFByb3BzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soY2FsbGJhY2tEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIHRoaXMucmVwb3J0RXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogZmV0Y2hDb250ZXN0cyhjYWxsYmFjaylcbiAgICAgICAgICogRmV0Y2hlcyBhbGwgY29udGVzdHMgdGhhdCdyZSBiZWluZyBzdG9yZWQgaW4gRmlyZWJhc2UsIGFuZCBwYXNzZXMgdGhlbSBpbnRvIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICAqIEBhdXRob3IgR2lnYWJ5dGUgR2lhbnQgKDIwMTUpXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrOiBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaW52b2tlIG9uY2Ugd2UndmUgY2FwdHVyZWQgYWxsIHRoZSBkYXRhIHRoYXQgd2UgbmVlZC5cbiAgICAgICAgICogQHRvZG8gKEdpZ2FieXRlIEdpYW50KTogQWRkIGJldHRlciBjb21tZW50cyFcbiAgICAgICAgICovXG4gICAgICAgIGZldGNoQ29udGVzdHM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoIWNhbGxiYWNrIHx8ICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzZWQgdG8gcmVmZXJlbmNlIEZpcmViYXNlXG4gICAgICAgICAgICBsZXQgZmlyZWJhc2VSZWYgPSAobmV3IHdpbmRvdy5GaXJlYmFzZShGSVJFQkFTRV9LRVkpKTtcblxuICAgICAgICAgICAgLy8gRmlyZWJhc2UgY2hpbGRyZW5cbiAgICAgICAgICAgIGxldCBjb250ZXN0S2V5c0NoaWxkID0gZmlyZWJhc2VSZWYuY2hpbGQoXCJjb250ZXN0S2V5c1wiKTtcbiAgICAgICAgICAgIGxldCBjb250ZXN0c0NoaWxkID0gZmlyZWJhc2VSZWYuY2hpbGQoXCJjb250ZXN0c1wiKTtcblxuICAgICAgICAgICAgLy8gUHJvcGVydGllcyB0aGF0IHdlIG11c3QgaGF2ZSBiZWZvcmUgd2UgY2FuIGludm9rZSBvdXIgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgICAgIGxldCByZXF1aXJlZFByb3BzID0gW1xuICAgICAgICAgICAgICAgIFwiaWRcIixcbiAgICAgICAgICAgICAgICBcIm5hbWVcIixcbiAgICAgICAgICAgICAgICBcImRlc2NcIixcbiAgICAgICAgICAgICAgICBcImltZ1wiLFxuICAgICAgICAgICAgICAgIFwiZW50cnlDb3VudFwiXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBrZXlzV2VGb3VuZCBob2xkcyBhIGxpc3Qgb2YgYWxsIG9mIHRoZSBjb250ZXN0IGtleXMgdGhhdCB3ZSd2ZSBmb3VuZCBzbyBmYXJcbiAgICAgICAgICAgIHZhciBrZXlzV2VGb3VuZCA9IFsgXTtcblxuICAgICAgICAgICAgLy8gY2FsbGJhY2tEYXRhIGlzIHRoZSBvYmplY3QgdGhhdCBnZXRzIHBhc3NlZCBpbnRvIG91ciBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrRGF0YSA9IHsgfTtcblxuICAgICAgICAgICAgLy8gXCJRdWVyeVwiIG91ciBjb250ZXN0S2V5c0NoaWxkXG4gICAgICAgICAgICBjb250ZXN0S2V5c0NoaWxkLm9yZGVyQnlLZXkoKS5vbihcImNoaWxkX2FkZGVkXCIsIGZ1bmN0aW9uKGZiSXRlbSkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgY3VycmVudCBrZXkgdG8gb3VyIFwia2V5c1dlRm91bmRcIiBhcnJheVxuICAgICAgICAgICAgICAgIGtleXNXZUZvdW5kLnB1c2goZmJJdGVtLmtleSgpKTtcblxuICAgICAgICAgICAgICAgIGxldCB0aGlzQ29udGVzdCA9IGNvbnRlc3RzQ2hpbGQuY2hpbGQoZmJJdGVtLmtleSgpKTtcblxuICAgICAgICAgICAgICAgIHZhciB0aGlzQ29udGVzdERhdGEgPSB7IH07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBwcm9wSW5kID0gMDsgcHJvcEluZCA8IHJlcXVpcmVkUHJvcHMubGVuZ3RoOyBwcm9wSW5kKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJQcm9wZXJ0eSA9IHJlcXVpcmVkUHJvcHNbcHJvcEluZF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXNDb250ZXN0LmNoaWxkKGN1cnJQcm9wZXJ0eSkub25jZShcInZhbHVlXCIsIGZ1bmN0aW9uKGZiU25hcHNob3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNDb250ZXN0RGF0YVtjdXJyUHJvcGVydHldID0gZmJTbmFwc2hvdC52YWwoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyAoR2lnYWJ5dGUgR2lhbnQpOiBHZXQgcmlkIG9mIGFsbCB0aGlzIG5lc3RlZCBcImNyYXBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXNDb250ZXN0RGF0YSkubGVuZ3RoID09PSByZXF1aXJlZFByb3BzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrRGF0YVtmYkl0ZW0ua2V5KCldID0gdGhpc0NvbnRlc3REYXRhO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKGNhbGxiYWNrRGF0YSkubGVuZ3RoID09PSBrZXlzV2VGb3VuZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soY2FsbGJhY2tEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRoaXMucmVwb3J0RXJyb3IpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogZmV0Y2hDb250ZXN0RW50cmllcyhjb250ZXN0SWQsIGNhbGxiYWNrKVxuICAgICAgICAgKlxuICAgICAgICAgKiBAYXV0aG9yIEdpZ2FieXRlIEdpYW50ICgyMDE1KVxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gY29udGVzdElkOiBUaGUgS2hhbiBBY2FkZW15IHNjcmF0Y2hwYWQgSUQgb2YgdGhlIGNvbnRlc3QgdGhhdCB3ZSB3YW50IHRvIGZldGNoIGVudHJpZXMgZm9yLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjazogVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZSBhZnRlciB3ZSd2ZSBmZXRjaGVkIGFsbCB0aGUgZGF0YSB0aGF0IHdlIG5lZWQuXG4gICAgICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbG9hZEhvd01hbnkqOiBUaGUgbnVtYmVyIG9mIGVudHJpZXMgdG8gbG9hZC4gSWYgbm8gdmFsdWUgaXMgcGFzc2VkIHRvIHRoaXMgcGFyYW1ldGVyLFxuICAgICAgICAgKiAgZmFsbGJhY2sgb250byBhIGRlZmF1bHQgdmFsdWUuXG4gICAgICAgICAqL1xuICAgICAgICBmZXRjaENvbnRlc3RFbnRyaWVzOiBmdW5jdGlvbihjb250ZXN0SWQsIGNhbGxiYWNrLCBsb2FkSG93TWFueSA9IERFRl9OVU1fRU5UUklFU19UT19MT0FELCBpbmNsdWRlSnVkZ2VkID0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gSWYgd2UgZG9uJ3QgaGF2ZSBhIHZhbGlkIGNhbGxiYWNrIGZ1bmN0aW9uLCBleGl0IHRoZSBmdW5jdGlvbi5cbiAgICAgICAgICAgIGlmICghY2FsbGJhY2sgfHwgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNlZCB0byByZWZlcmVuY2UgRmlyZWJhc2VcbiAgICAgICAgICAgIGxldCBmaXJlYmFzZVJlZiA9IChuZXcgd2luZG93LkZpcmViYXNlKEZJUkVCQVNFX0tFWSkpO1xuXG4gICAgICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIEZpcmViYXNlIGNoaWxkcmVuXG4gICAgICAgICAgICBsZXQgdGhpc0NvbnRlc3RSZWYgPSBmaXJlYmFzZVJlZi5jaGlsZChcImNvbnRlc3RzXCIpLmNoaWxkKGNvbnRlc3RJZCk7XG4gICAgICAgICAgICBsZXQgY29udGVzdEVudHJpZXNSZWYgPSB0aGlzQ29udGVzdFJlZi5jaGlsZChcImVudHJpZXNcIik7XG5cbiAgICAgICAgICAgIC8vIFVzZWQgdG8ga2VlcCB0cmFjayBvZiBob3cgbWFueSBlbnRyaWVzIHdlJ3ZlIGxvYWRlZFxuICAgICAgICAgICAgdmFyIG51bUxvYWRlZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIFVzZWQgdG8gc3RvcmUgZWFjaCBvZiB0aGUgZW50cmllcyB0aGF0IHdlJ3ZlIGxvYWRlZFxuICAgICAgICAgICAgdmFyIGVudHJ5S2V5cyA9IFsgXTtcblxuICAgICAgICAgICAgdmFyIGFscmVhZHlDaGVja2VkID0gW107XG5cbiAgICAgICAgICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgICAgICAgICAgY29udGVzdEVudHJpZXNSZWYub25jZShcInZhbHVlXCIsIGZ1bmN0aW9uKGZiU25hcHNob3QpIHtcbiAgICAgICAgICAgICAgICBsZXQgdG1wRW50cnlLZXlzID0gT2JqZWN0LmtleXMoZmJTbmFwc2hvdC52YWwoKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodG1wRW50cnlLZXlzLmxlbmd0aCA8IGxvYWRIb3dNYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRIb3dNYW55ID0gdG1wRW50cnlLZXlzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAobnVtTG9hZGVkIDwgbG9hZEhvd01hbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdG1wRW50cnlLZXlzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RlZEtleSA9IHRtcEVudHJ5S2V5c1tyYW5kb21JbmRleF07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVudHJ5S2V5cy5pbmRleE9mKHNlbGVjdGVkS2V5KSA9PT0gLTEgJiYgKCFmYlNuYXBzaG90LnZhbCgpW3NlbGVjdGVkS2V5XS5oYXNPd25Qcm9wZXJ0eShcImFyY2hpdmVkXCIpIHx8IGZiU25hcHNob3QudmFsKClbc2VsZWN0ZWRLZXldLmFyY2hpdmVkID09PSBmYWxzZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYlNuYXBzaG90LnZhbCgpW3NlbGVjdGVkS2V5XS5oYXNPd25Qcm9wZXJ0eShcInNjb3Jlc1wiKSAmJiAhaW5jbHVkZUp1ZGdlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmJTbmFwc2hvdC52YWwoKVtzZWxlY3RlZEtleV0uc2NvcmVzLnJ1YnJpYy5oYXNPd25Qcm9wZXJ0eShcImp1ZGdlc1dob1ZvdGVkXCIpIHx8IGZiU25hcHNob3QudmFsKClbc2VsZWN0ZWRLZXldLnNjb3Jlcy5ydWJyaWMuanVkZ2VzV2hvVm90ZWQuaW5kZXhPZihzZWxmLmZldGNoRmlyZWJhc2VBdXRoKCkudWlkKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50cnlLZXlzLnB1c2goc2VsZWN0ZWRLZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1Mb2FkZWQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxyZWFkeUNoZWNrZWQuaW5kZXhPZihzZWxlY3RlZEtleSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFscmVhZHkganVkZ2VkIFwiICsgc2VsZWN0ZWRLZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxyZWFkeUNoZWNrZWQucHVzaChzZWxlY3RlZEtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkSG93TWFueS0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRyeUtleXMucHVzaChzZWxlY3RlZEtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtTG9hZGVkKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbGV0IGNhbGxiYWNrV2FpdCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChudW1Mb2FkZWQgPT09IGxvYWRIb3dNYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoY2FsbGJhY2tXYWl0KTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZW50cnlLZXlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGxvYWRDb250ZXN0RW50cnkoY29udGVzdElkLCBlbnRyeUlkLCBjYWxsYmFjaylcbiAgICAgICAgICogTG9hZHMgYSBjb250ZXN0IGVudHJ5ICh3aGljaCBpcyBzcGVjaWZpZWQgdmlhIHByb3ZpZGluZyBhIGNvbnRlc3QgaWQgYW5kIGFuIGVudHJ5IGlkKS5cbiAgICAgICAgICogQGF1dGhvciBHaWdhYnl0ZSBHaWFudCAoMjAxNSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlc3RJZDogVGhlIHNjcmF0Y2hwYWQgSUQgb2YgdGhlIGNvbnRlc3QgdGhhdCB0aGlzIGVudHJ5IHJlc2lkZXMgdW5kZXIuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlbnRyeUlkOiBUaGUgc2NyYXRjaHBhZCBJRCBvZiB0aGUgZW50cnkuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrOiBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaW52b2tlIG9uY2Ugd2UndmUgbG9hZGVkIGFsbCB0aGUgcmVxdWlyZWQgZGF0YS5cbiAgICAgICAgICogQHRvZG8gKEdpZ2FieXRlIEdpYW50KTogQWRkIGF1dGhlbnRpY2F0aW9uIHRvIHRoaXMgZnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIGxvYWRDb250ZXN0RW50cnk6IGZ1bmN0aW9uKGNvbnRlc3RJZCwgZW50cnlJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGRvbid0IGhhdmUgYSB2YWxpZCBjYWxsYmFjayBmdW5jdGlvbiwgZXhpdCB0aGUgZnVuY3Rpb24uXG4gICAgICAgICAgICBpZiAoIWNhbGxiYWNrIHx8ICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzZWQgdG8gcmVmZXJlbmNlIEZpcmViYXNlXG4gICAgICAgICAgICBsZXQgZmlyZWJhc2VSZWYgPSAobmV3IHdpbmRvdy5GaXJlYmFzZShGSVJFQkFTRV9LRVkpKTtcblxuICAgICAgICAgICAgLy8gUmVmZXJlbmNlcyB0byBGaXJlYmFzZSBjaGlsZHJlblxuICAgICAgICAgICAgbGV0IGNvbnRlc3RSZWYgPSBmaXJlYmFzZVJlZi5jaGlsZChcImNvbnRlc3RzXCIpLmNoaWxkKGNvbnRlc3RJZCk7XG4gICAgICAgICAgICBsZXQgZW50cmllc1JlZiA9IGNvbnRlc3RSZWYuY2hpbGQoXCJlbnRyaWVzXCIpLmNoaWxkKGVudHJ5SWQpO1xuXG4gICAgICAgICAgICBsZXQgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0UGVybUxldmVsKGZ1bmN0aW9uKHBlcm1MZXZlbCkge1xuICAgICAgICAgICAgICAgIC8vIEEgdmFyaWFibGUgY29udGFpbmluZyBhIGxpc3Qgb2YgYWxsIHRoZSBwcm9wZXJ0aWVzIHRoYXQgd2UgbXVzdCBsb2FkIGJlZm9yZSB3ZSBjYW4gaW52b2tlIG91ciBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICAgICAgICAgIHZhciByZXF1aXJlZFByb3BzID0gW1wiaWRcIiwgXCJuYW1lXCIsIFwidGh1bWJcIl07XG5cbiAgICAgICAgICAgICAgICBpZiAocGVybUxldmVsID49IDUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWRQcm9wcy5wdXNoKFwic2NvcmVzXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFRoZSBKU09OIG9iamVjdCB0aGF0IHdlJ2xsIHBhc3MgaW50byB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2tEYXRhID0geyB9O1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZXF1aXJlZFByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwcm9wUmVmID0gZW50cmllc1JlZi5jaGlsZChyZXF1aXJlZFByb3BzW2ldKTtcblxuICAgICAgICAgICAgICAgICAgICBwcm9wUmVmLm9uY2UoXCJ2YWx1ZVwiLCBmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tEYXRhW3JlcXVpcmVkUHJvcHNbaV1dID0gc25hcHNob3QudmFsKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhjYWxsYmFja0RhdGEpLmxlbmd0aCA9PT0gcmVxdWlyZWRQcm9wcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhjYWxsYmFja0RhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBzZWxmLnJlcG9ydEVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGxvYWRYQ29udGVzdEVudHJpZXMoY29udGVzdElkLCBjYWxsYmFjaywgbG9hZEhvd01hbnkpXG4gICAgICAgICAqIExvYWRzIFwieFwiIGNvbnRlc3QgZW50cmllcywgYW5kIHBhc3NlcyB0aGVtIGludG8gYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAgICogQGF1dGhvciBHaWdhYnl0ZSBHaWFudCAoMjAxNSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlc3RJZDogVGhlIHNjcmF0Y2hwYWQgSUQgb2YgdGhlIGNvbnRlc3QgdGhhdCB3ZSB3YW50IHRvIGxvYWQgZW50cmllcyBmcm9tLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjazogVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZSBvbmNlIHdlJ3ZlIGxvYWRlZCBhbGwgdGhlIHJlcXVpcmVkIGRhdGEuXG4gICAgICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbG9hZEhvd01hbnk6IFRoZSBudW1iZXIgb2YgZW50cmllcyB0aGF0IHdlJ2QgbGlrZSB0byBsb2FkLlxuICAgICAgICAgKi9cbiAgICAgICAgbG9hZFhDb250ZXN0RW50cmllczogZnVuY3Rpb24oY29udGVzdElkLCBjYWxsYmFjaywgbG9hZEhvd01hbnksIGluY2x1ZGVKdWRnZWQgPSB0cnVlKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2tEYXRhID0ge307XG5cbiAgICAgICAgICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgICAgICAgICAgdGhpcy5mZXRjaENvbnRlc3RFbnRyaWVzKGNvbnRlc3RJZCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBlSW5kID0gMDsgZUluZCA8IHJlc3BvbnNlLmxlbmd0aDsgZUluZCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubG9hZENvbnRlc3RFbnRyeShjb250ZXN0SWQsIHJlc3BvbnNlW2VJbmRdLCBmdW5jdGlvbihlbnRyeURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrRGF0YVtyZXNwb25zZVtlSW5kXV0gPSBlbnRyeURhdGE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhjYWxsYmFja0RhdGEpLmxlbmd0aCA9PT0gcmVzcG9uc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soY2FsbGJhY2tEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgbG9hZEhvd01hbnksIGluY2x1ZGVKdWRnZWQpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogZ2V0RGVmYXVsdFJ1YnJpY3MoY2FsbGJhY2spXG4gICAgICAgICAqIEBhdXRob3IgR2lnYWJ5dGUgR2lhbnQgKDIwMTUpXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrOiBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaW52b2tlIG9uY2Ugd2UndmUgbG9hZGVkIGFsbCB0aGUgZGVmYXVsdCBydWJyaWNzXG4gICAgICAgICAqL1xuICAgICAgICBnZXREZWZhdWx0UnVicmljczogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGxldCBmaXJlYmFzZVJlZiA9IChuZXcgd2luZG93LkZpcmViYXNlKEZJUkVCQVNFX0tFWSkpO1xuICAgICAgICAgICAgbGV0IHJ1YnJpY3NDaGlsZCA9IGZpcmViYXNlUmVmLmNoaWxkKFwicnVicmljc1wiKTtcblxuICAgICAgICAgICAgcnVicmljc0NoaWxkLm9uY2UoXCJ2YWx1ZVwiLCBmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHNuYXBzaG90LnZhbCgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogZ2V0Q29udGVzdFJ1YnJpY3MoY29udGVzdElkLCBjYWxsYmFjaylcbiAgICAgICAgICogQGF1dGhvciBHaWdhYnl0ZSBHaWFudCAoMjAxNSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlc3RJZDogVGhlIElEIG9mIHRoZSBjb250ZXN0IHRoYXQgd2Ugd2FudCB0byBsb2FkIHRoZSBydWJyaWNzIGZvclxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjazogVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZSBvbmNlIHdlJ3ZlIGxvYWRlZCBhbGwgb2YgdGhlIHJ1YnJpY3NcbiAgICAgICAgICovXG4gICAgICAgIGdldENvbnRlc3RSdWJyaWNzOiBmdW5jdGlvbihjb250ZXN0SWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2tEYXRhID0ge307XG5cbiAgICAgICAgICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgICAgICAgICAgdGhpcy5nZXREZWZhdWx0UnVicmljcyhmdW5jdGlvbihkZWZhdWx0UnVicmljcykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrRGF0YSA9IGRlZmF1bHRSdWJyaWNzO1xuICAgICAgICAgICAgICAgIHNlbGYuZmV0Y2hDb250ZXN0KGNvbnRlc3RJZCwgZnVuY3Rpb24oY29udGVzdFJ1YnJpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGN1c3RvbVJ1YnJpY3MgPSBjb250ZXN0UnVicmljcy5ydWJyaWNzO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXN0b21SdWJyaWNzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjdXN0b21SdWJyaWMgaW4gY3VzdG9tUnVicmljcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2FsbGJhY2tEYXRhLmhhc093blByb3BlcnR5KGN1c3RvbVJ1YnJpYykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tEYXRhW2N1c3RvbVJ1YnJpY10gPSBjdXN0b21SdWJyaWNzW2N1c3RvbVJ1YnJpY107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VzdG9tUnVicmljcy5oYXNPd25Qcm9wZXJ0eShcIk9yZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgb0luZCA9IDA7IG9JbmQgPCBjdXN0b21SdWJyaWNzLk9yZGVyLmxlbmd0aDsgb0luZCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGUgY3VycmVudCBydWJyaWMgaXRlbSBpcyBhY3R1YWxseSBhIHZhbGlkIHJ1YnJpYyBpdGVtLCBhbmQgbWFrZSBzdXJlIGl0J3Mgbm90IHRoZSBcIk9yZGVyXCIgaXRlbS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1c3RvbVJ1YnJpY3MuaGFzT3duUHJvcGVydHkoY3VzdG9tUnVicmljcy5PcmRlcltvSW5kXSkgJiYgY3VzdG9tUnVicmljcy5PcmRlcltvSW5kXSAhPT0gXCJPcmRlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGhpc1J1YnJpYyA9IGN1c3RvbVJ1YnJpY3MuT3JkZXJbb0luZF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYWxsYmFja0RhdGEuT3JkZXIuaW5kZXhPZih0aGlzUnVicmljKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0RhdGEuT3JkZXIucHVzaCh0aGlzUnVicmljKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tUnVicmljcy5PcmRlciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soY2FsbGJhY2tEYXRhKTtcbiAgICAgICAgICAgICAgICB9LCBbXCJydWJyaWNzXCJdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICoganVkZ2VFbnRyeShjb250ZXN0SWQsIGVudHJ5SWQsIHNjb3JlRGF0YSwgY2FsbGJhY2spXG4gICAgICAgICAqIEBhdXRob3IgR2lnYWJ5dGUgR2lhbnQgKDIwMTUpXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb250ZXN0SWQ6IFRoZSBJRCBvZiB0aGUgY29udGVzdCB0aGF0IHdlJ3JlIGp1ZGdpbmcgYW4gZW50cnkgZm9yXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlbnRyeUlkOiBUaGUgSUQgb2YgdGhlIGVudHJ5IHRoYXQgd2UncmUganVkZ2luZ1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gc2NvcmVEYXRhOiBUaGUgc2NvcmluZyBkYXRhXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrOiBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaW52b2tlIGFmdGVyIHdlJ3ZlIHZhbGlkYXRlZCB0aGUgc2NvcmVzLCBhbmQgc3VibWl0dGVkIHRoZW0uXG4gICAgICAgICAqL1xuICAgICAgICBqdWRnZUVudHJ5OiBmdW5jdGlvbihjb250ZXN0SWQsIGVudHJ5SWQsIHNjb3JlRGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIDA6IENoZWNrIHRoZSB1c2VycyBwZXJtIGxldmVsLCBpZiB0aGVpciBwZXJtTGV2ZWwgaXNuJ3QgPj0gNCwgZXhpdC5cbiAgICAgICAgICAgIC8vIDE6IEZldGNoIHRoZSBydWJyaWNzIGZvciB0aGUgY3VycmVudCBjb250ZXN0LCB0byBtYWtlIHN1cmUgd2UncmUgbm90IGRvaW5nIGFueXRoaW5nIGZ1bmt5XG4gICAgICAgICAgICAvLyAyOiBWYWxpZGF0ZSB0aGUgZGF0YSB0aGF0IHdhcyBzdWJtaXR0ZWQgdG8gdGhlIGZ1bmN0aW9uXG4gICAgICAgICAgICAvLyAzOiBTdWJtaXQgdGhlIGRhdGEgdG8gRmlyZWJhc2VcblxuICAgICAgICAgICAgbGV0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICAgICB0aGlzLmdldFBlcm1MZXZlbChmdW5jdGlvbihwZXJtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAocGVybUxldmVsID49IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRoaXNKdWRnZSA9IHNlbGYuZmV0Y2hGaXJlYmFzZUF1dGgoKS51aWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgc2VsZi5nZXRDb250ZXN0UnVicmljcyhjb250ZXN0SWQsIGZ1bmN0aW9uKGNvbnRlc3RSdWJyaWNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXN0UnVicmljcy5qdWRnZXNXaG9Wb3RlZCA9IChjb250ZXN0UnVicmljcy5qdWRnZXNXaG9Wb3RlZCA9PT0gdW5kZWZpbmVkID8gW10gOiBjb250ZXN0UnVicmljcy5qdWRnZXNXaG9Wb3RlZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXN0UnVicmljcy5oYXNPd25Qcm9wZXJ0eShcImp1ZGdlc1dob1ZvdGVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlc3RSdWJyaWNzLmp1ZGdlc1dob1ZvdGVkLmluZGV4T2YodGhpc0p1ZGdlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soRVJST1JfTUVTU0FHRVMuRVJSX0FMUkVBRFlfVk9URUQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXNKdWRnZXNWb3RlID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHNjb3JlIGluIHNjb3JlRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXN0UnVicmljcy5oYXNPd25Qcm9wZXJ0eShzY29yZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjb3JlVmFsID0gLTE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3JlRGF0YVtzY29yZV0gPiBjb250ZXN0UnVicmljc1tzY29yZV0ubWF4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29yZVZhbCA9IGNvbnRlc3RSdWJyaWNzW3Njb3JlXS5tYXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcmVEYXRhW3Njb3JlXSA8IGNvbnRlc3RSdWJyaWNzW3Njb3JlXS5taW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3JlVmFsID0gY29udGVzdFJ1YnJpY3Nbc2NvcmVdLm1pbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3JlVmFsID0gc2NvcmVEYXRhW3Njb3JlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNKdWRnZXNWb3RlW3Njb3JlXSA9IHNjb3JlVmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpc0p1ZGdlc1ZvdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmZldGNoQ29udGVzdEVudHJ5KGNvbnRlc3RJZCwgZW50cnlJZCwgZnVuY3Rpb24oZXhpc3RpbmdTY29yZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZ1Njb3JlRGF0YSA9IGV4aXN0aW5nU2NvcmVEYXRhLnNjb3JlcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlc3RSdWJyaWNzLmp1ZGdlc1dob1ZvdGVkLnB1c2godGhpc0p1ZGdlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhVG9Xcml0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganVkZ2VzV2hvVm90ZWQ6IGNvbnRlc3RSdWJyaWNzLmp1ZGdlc1dob1ZvdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1Njb3JlRGF0YS5oYXNPd25Qcm9wZXJ0eShcInJ1YnJpY1wiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXhpc3RpbmdSdWJyaWNJdGVtU2NvcmVzID0gZXhpc3RpbmdTY29yZURhdGEucnVicmljO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJ1YnJpY0l0ZW1zID0gY29udGVzdFJ1YnJpY3M7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgcnVicmljSXRlbSBpbiBydWJyaWNJdGVtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNKdWRnZXNWb3RlLmhhc093blByb3BlcnR5KHJ1YnJpY0l0ZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUaGUgaXRlbTogXCIgKyBydWJyaWNJdGVtKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXBTY29yZU9iaiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZnOiAoZXhpc3RpbmdSdWJyaWNJdGVtU2NvcmVzW3J1YnJpY0l0ZW1dID09PSB1bmRlZmluZWQgPyAxIDogZXhpc3RpbmdSdWJyaWNJdGVtU2NvcmVzW3J1YnJpY0l0ZW1dLmF2ZyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdWdoOiAoZXhpc3RpbmdSdWJyaWNJdGVtU2NvcmVzW3J1YnJpY0l0ZW1dID09PSB1bmRlZmluZWQgPyAxIDogZXhpc3RpbmdSdWJyaWNJdGVtU2NvcmVzW3J1YnJpY0l0ZW1dLnJvdWdoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVRvV3JpdGUuanVkZ2VzV2hvVm90ZWQubGVuZ3RoIC0gMSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0bXBTY29yZU9iai5yb3VnaCA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRtcFNjb3JlT2JqLmF2ZyA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG1wU2NvcmVPYmoucm91Z2ggPSB0bXBTY29yZU9iai5yb3VnaCArIHRoaXNKdWRnZXNWb3RlW3J1YnJpY0l0ZW1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRtcFNjb3JlT2JqLmF2ZyA9IHRtcFNjb3JlT2JqLnJvdWdoIC8gKGNvbnRlc3RSdWJyaWNzLmp1ZGdlc1dob1ZvdGVkLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhVG9Xcml0ZVtydWJyaWNJdGVtXSA9IHRtcFNjb3JlT2JqO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YVRvV3JpdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZiUmVmID0gKG5ldyB3aW5kb3cuRmlyZWJhc2UoRklSRUJBU0VfS0VZKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNoaWxkKFwiY29udGVzdHNcIikuY2hpbGQoY29udGVzdElkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2hpbGQoXCJlbnRyaWVzXCIpLmNoaWxkKGVudHJ5SWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jaGlsZChcInNjb3Jlc1wiKS5jaGlsZChcInJ1YnJpY1wiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZiUmVmLnNldChkYXRhVG9Xcml0ZSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnJlcG9ydEVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBbXCJzY29yZXNcIl0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhFUlJPUl9NRVNTQUdFUy5FUlJfTk9UX0pVREdFKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59KSgpO1xuIiwidmFyIENKUyA9IHJlcXVpcmUoXCIuLi9iYWNrZW5kL2NvbnRlc3RfanVkZ2luZ19zeXMuanNcIik7XG52YXIgaGVscGVycyA9IHJlcXVpcmUoXCIuLi9oZWxwZXJzL2hlbHBlcnMuanNcIik7XG5cbi8qKlxuICogY3JlYXRlQ29udGVzdENvbnRyb2woY29udHJvbERhdGEpXG4gKiBDcmVhdGVzIGEgYnV0dG9uIHVzaW5nIHRoZSBkYXRhIHNwZWNpZmllZCwgYW5kIHJldHVybnMgaXQgdG8gdGhlIGNhbGxlci5cbiAqIEBhdXRob3IgR2lnYWJ5dGUgR2lhbnQgKDIwMTUpXG4gKiBAY29udHJpYnV0b3JzIERhcnJ5bCBZZW8gKDIwMTUpXG4gKiBAcGFyYW0ge09iamVjdH0gY29udHJvbERhdGE6IFRoZSBKU09OIG9iamVjdCBjb250YWluaW5nIHRoZSBkYXRhIGZvciB0aGUgY29udHJvbCAoc3VjaCBhcyBkaXNwbGF5IHRleHQgYW5kIHdoZXJlIHRoZSBjb250cm9sIHNob3VsZCBsaW5rIHRvKVxuICogQHJldHVybnMge2pRdWVyeX0gY29udGVzdENvbnRyb2w6IFRoZSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5ld2x5IGNyZWF0ZWQgY29udGVzdCBjb250cm9sXG4gKi9cbnZhciBjcmVhdGVDb250ZXN0Q29udHJvbCA9IGZ1bmN0aW9uKGNvbnRyb2xEYXRhKSB7XG4gICAgcmV0dXJuICQoXCI8YT5cIilcbiAgICAgICAgLmFkZENsYXNzKFwid2F2ZXMtZWZmZWN0IHdhdmVzLWxpZ2h0IGFtYmVyIGRhcmtlbi0yIGJ0biBjb250ZXN0LWNvbnRyb2xcIilcbiAgICAgICAgLnRleHQoY29udHJvbERhdGEudGV4dClcbiAgICAgICAgLmF0dHIoXCJocmVmXCIsIChjb250cm9sRGF0YS5saW5rID09PSB1bmRlZmluZWQgPyBudWxsIDogY29udHJvbERhdGEubGluaykpO1xufTtcblxuLyoqXG4gKiBjcmVhdGVDb250ZXN0RGV0YWlscyhjb250ZXN0RGF0YSlcbiAqIENyZWF0ZXMgYSBcImNvbnRlc3QgZGV0YWlsc1wiIGRpdiwgYW5kIHJldHVybnMgaXQgdG8gdGhlIGNhbGxlci5cbiAqIEBhdXRob3IgR2lnYWJ5dGUgR2lhbnQgKDIwMTUpXG4gKiBAY29udHJpYnV0b3JzIERhcnJ5bCBZZW8gKDIwMTUpXG4gKiBAcGFyYW0ge09iamVjdH0gY29udGVzdERhdGE6IEEgSlNPTiBvYmplY3QgY29udGFpbmluZyB0aGUgZGF0YSBmb3IgYSBjb250ZXN0LlxuICogQHJldHVybnMge2pRdWVyeX0gY29udGVzdERldGFpbHM6IFRoZSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIFwiY29udGVzdCBkZXRhaWxzXCIgZGl2LlxuICovXG52YXIgY3JlYXRlQ29udGVzdERldGFpbHMgPSBmdW5jdGlvbihjb250ZXN0RGF0YSkge1xuICAgIHJldHVybiAkKFwiPGRpdj5cIilcbiAgICAgICAgLmFkZENsYXNzKFwiY29sIHMxMiBtOVwiKVxuICAgICAgICAuYXBwZW5kKFxuICAgICAgICAgICAgJChcIjxoNT5cIikuYWRkQ2xhc3MoXCJ0aXRsZVwiKS50ZXh0KGNvbnRlc3REYXRhLnRpdGxlKVxuICAgICAgICApXG4gICAgICAgIC5hcHBlbmQoXG4gICAgICAgICAgICAkKFwiPGRpdj5cIilcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoXCJkZXNjcmlwdGlvblwiKVxuICAgICAgICAgICAgICAgIC5odG1sKGNvbnRlc3REYXRhLmRlc2NyaXB0aW9uKVxuICAgICAgICApO1xufTtcblxuLyoqXG4gKiBjcmVhdGVDb250ZXN0SG9sZGVyKGNvbnRlc3REYXRhKVxuICogQ3JlYXRlcyBhIFwiY29udGVzdCBob2xkZXJcIiBkaXYsIGFuZCByZXR1cm5zIGl0IHRvIHRoZSBjYWxsZXIuXG4gKiBAYXV0aG9yIEdpZ2FieXRlIEdpYW50ICgyMDE1KVxuICogQGNvbnRyaWJ1dG9ycyBEYXJyeWwgWWVvICgyMDE1KVxuICogQHBhcmFtIHtPYmplY3R9IGNvbnRlc3REYXRhOiBBIEpTT04gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGRhdGEgZm9yIGEgY29udGVzdC5cbiAqIEByZXR1cm5zIHtqUXVlcnl9IGNvbnRlc3RIb2xkZXI6IFRoZSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIFwiY29udGVzdCBob2xkZXJcIiBkaXYuXG4gKi9cbnZhciBjcmVhdGVDb250ZXN0SG9sZGVyID0gZnVuY3Rpb24oY29udGVzdERhdGEpIHtcbiAgICB2YXIgY29udGVzdEhvbGRlciA9ICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImNvbnRlc3Qgc2VjdGlvblwiKS5hdHRyKFwiaWRcIiwgY29udGVzdERhdGEuaWQpXG4gICAgICAgIC5hcHBlbmQoXG4gICAgICAgICAgICBjcmVhdGVDb250ZXN0RGV0YWlscyhjb250ZXN0RGF0YSlcbiAgICAgICAgKVxuICAgICAgICAuYXBwZW5kKFxuICAgICAgICAgICAgJChcIjxkaXY+XCIpLmFkZENsYXNzKFwiY29sIHMxMiBtM1wiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXG4gICAgICAgICAgICAgICAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImNlbnRlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKFwiPGltZz5cIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJzcmNcIiwgY29udGVzdERhdGEudGh1bWJuYWlsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoXCJpbWctcmVzcG9uc2l2ZSBjb250ZXN0LXRodW1ibmFpbFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVDb250ZXN0Q29udHJvbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiVmlldyBFbnRyaWVzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbms6IFwiY29udGVzdC5odG1sP2NvbnRlc3Q9XCIgKyBjb250ZXN0RGF0YS5pZCArIFwiJmNvdW50PTMyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgKTtcblxuICAgIENKUy5nZXRQZXJtTGV2ZWwoZnVuY3Rpb24ocGVybUxldmVsKSB7XG4gICAgICAgIGlmIChwZXJtTGV2ZWwgPj0gNSkge1xuICAgICAgICAgICAgJChcIiNcIiArIGNvbnRlc3REYXRhLmlkICsgXCIgLmNlbnRlclwiKS5hcHBlbmQoXG4gICAgICAgICAgICAgICAgY3JlYXRlQ29udGVzdENvbnRyb2woe1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlZpZXcgTGVhZGVyYm9hcmRcIixcbiAgICAgICAgICAgICAgICAgICAgbGluazogXCJsZWFkZXJib2FyZC5odG1sP2NvbnRlc3Q9XCIgKyBjb250ZXN0RGF0YS5pZFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY29udGVzdEhvbGRlcjtcbn07XG5cbnZhciBzZXR1cFBhZ2UgPSBmdW5jdGlvbihjb250ZXN0RGF0YSkge1xuICAgIGZvciAobGV0IGNpZCBpbiBjb250ZXN0RGF0YSkge1xuICAgICAgICBsZXQgY29udGVzdCA9IGNvbnRlc3REYXRhW2NpZF07XG5cbiAgICAgICAgJChcIiNjb250ZXN0c1wiKS5hcHBlbmQoXG4gICAgICAgICAgICAkKFwiPGRpdj5cIikuYWRkQ2xhc3MoXCJyb3dcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVDb250ZXN0SG9sZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBjb250ZXN0LmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGNvbnRlc3QubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAoY29udGVzdC5kZXNjID09PSBcIlwiID8gXCJObyBkZXNjcmlwdGlvbiBwcm92aWRlZC5cIiA6IGNvbnRlc3QuZGVzYyksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWw6IFwiaHR0cHM6Ly93d3cua2hhbmFjYWRlbXkub3JnL1wiICsgY29udGVzdC5pbWdcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgICAgLmFwcGVuZChcbiAgICAgICAgICAgICQoXCI8ZGl2PlwiKS5hZGRDbGFzcyhcImRpdmlkZXJcIilcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG5oZWxwZXJzLmF1dGhlbnRpY2F0aW9uLnNldHVwUGFnZUF1dGgoXCIjYXV0aEJ0blwiLCBDSlMpO1xuQ0pTLmZldGNoQ29udGVzdHMoc2V0dXBQYWdlKTtcblxuLy8gJChcIiNhdXRoQnRuXCIpLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZXZ0KSB7XG4vLyAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbi8vICAgICBpZiAoZmJBdXRoID09PSBudWxsKSB7XG4vLyAgICAgICAgIENKUy5hdXRoZW50aWNhdGUoKTtcbi8vICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBDSlMuYXV0aGVudGljYXRlKHRydWUpO1xuLy8gICAgIH1cbi8vIH0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWRkQWRtaW5MaW5rOiBmdW5jdGlvbihzZWxlY3RvciwgY2pzV3JhcHBlcikge1xuICAgICAgICBjanNXcmFwcGVyLmdldFBlcm1MZXZlbChmdW5jdGlvbihwZXJtTGV2ZWwpIHtcbiAgICAgICAgICAgIGlmIChwZXJtTGV2ZWwgPj0gNSkge1xuICAgICAgICAgICAgICAgICQoXCI8bGk+XCIpLmFkZENsYXNzKFwiYWN0aXZlXCIpLmFwcGVuZChcbiAgICAgICAgICAgICAgICAgICAgJChcIjxhPlwiKS5hdHRyKFwiaHJlZlwiLCBcIi4vYWRtaW4vXCIpLnRleHQoXCJBZG1pbiBkYXNoYm9hcmRcIilcbiAgICAgICAgICAgICAgICApLmluc2VydEJlZm9yZSgkKHNlbGVjdG9yKS5wYXJlbnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgc2V0dXBPbkNsaWNrOiBmdW5jdGlvbihzZWxlY3RvciwgY2pzV3JhcHBlcikge1xuICAgICAgICAkKHNlbGVjdG9yKS5vbihcImNsaWNrXCIsIChldnQpID0+IHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBpZiAoY2pzV3JhcHBlci5mZXRjaEZpcmViYXNlQXV0aCgpID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY2pzV3JhcHBlci5hdXRoZW50aWNhdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2pzV3JhcHBlci5hdXRoZW50aWNhdGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgc2hvd1dlbGNvbWU6IGZ1bmN0aW9uKHNlbGVjdG9yLCBjanNXcmFwcGVyKSB7XG4gICAgICAgIGlmIChjanNXcmFwcGVyLmZldGNoRmlyZWJhc2VBdXRoKCkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICQoc2VsZWN0b3IpLnRleHQoXCJIZWxsbyBndWVzdCEgQ2xpY2sgbWUgdG8gbG9nIGluLlwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoc2VsZWN0b3IpLnRleHQoYEhlbGxvICR7Y2pzV3JhcHBlci5mZXRjaEZpcmViYXNlQXV0aCgpLmdvb2dsZS5kaXNwbGF5TmFtZX0hIChOb3QgeW91PyBDbGljayBoZXJlISlgKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0dXBQYWdlQXV0aDogZnVuY3Rpb24oYXV0aEJ0blNlbGVjdG9yLCBjanNXcmFwcGVyKSB7XG4gICAgICAgIHRoaXMuc2V0dXBPbkNsaWNrKGF1dGhCdG5TZWxlY3RvciwgY2pzV3JhcHBlcik7XG4gICAgICAgIHRoaXMuc2hvd1dlbGNvbWUoYXV0aEJ0blNlbGVjdG9yLCBjanNXcmFwcGVyKTtcbiAgICAgICAgLy8gdGhpcy5hZGRBZG1pbkxpbmsoYXV0aEJ0blNlbGVjdG9yLCBjanNXcmFwcGVyKTtcbiAgICB9XG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8qKlxuICAgICAqIGdldENvb2tpZShjb29raWVOYW1lKVxuICAgICAqIEZldGNoZXMgdGhlIHNwZWNpZmllZCBjb29raWUgZnJvbSB0aGUgYnJvd3NlciwgYW5kIHJldHVybnMgaXQncyB2YWx1ZS5cbiAgICAgKiBAYXV0aG9yIHczc2Nob29sc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjb29raWVOYW1lOiBUaGUgbmFtZSBvZiB0aGUgY29va2llIHRoYXQgd2Ugd2FudCB0byBmZXRjaC5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBjb29raWVWYWx1ZTogVGhlIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgY29va2llLCBvciBhbiBlbXB0eSBzdHJpbmcsIGlmIHRoZXJlIGlzIG5vIFwibm9uLWZhbHN5XCIgdmFsdWUuXG4gICAgICovXG4gICAgZ2V0Q29va2llOiBmdW5jdGlvbihjb29raWVOYW1lKSB7XG4gICAgICAgIC8vIEdldCB0aGUgY29va2llIHdpdGggbmFtZSBjb29raWUgKHJldHVybiBcIlwiIGlmIG5vbi1leGlzdGVudClcbiAgICAgICAgY29va2llTmFtZSA9IGNvb2tpZU5hbWUgKyBcIj1cIjtcbiAgICAgICAgLy8gQ2hlY2sgYWxsIG9mIHRoZSBjb29raWVzIGFuZCB0cnkgdG8gZmluZCB0aGUgb25lIGNvbnRhaW5pbmcgbmFtZS5cbiAgICAgICAgdmFyIGNvb2tpZUxpc3QgPSBkb2N1bWVudC5jb29raWUuc3BsaXQoXCI7XCIpO1xuICAgICAgICBmb3IgKHZhciBjSW5kID0gMDsgY0luZCA8IGNvb2tpZUxpc3QubGVuZ3RoOyBjSW5kICsrKSB7XG4gICAgICAgICAgICB2YXIgY3VyQ29va2llID0gY29va2llTGlzdFtjSW5kXTtcbiAgICAgICAgICAgIHdoaWxlIChjdXJDb29raWVbMF0gPT09IFwiIFwiKSB7XG4gICAgICAgICAgICAgICAgY3VyQ29va2llID0gY3VyQ29va2llLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlJ3ZlIGZvdW5kIHRoZSByaWdodCBjb29raWUsIHJldHVybiBpdHMgdmFsdWUuXG4gICAgICAgICAgICBpZiAoY3VyQ29va2llLmluZGV4T2YoY29va2llTmFtZSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VyQ29va2llLnN1YnN0cmluZyhjb29raWVOYW1lLmxlbmd0aCwgY3VyQ29va2llLmxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBpZiB0aGUgY29va2llIGRvZXNuJ3QgZXhpc3QsIHJldHVybiBcIlwiXG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogc2V0Q29va2llKGNvb2tpZU5hbWUsIHZhbHVlKVxuICAgICAqIENyZWF0ZXMvdXBkYXRlcyBhIGNvb2tpZSB3aXRoIHRoZSBkZXNpcmVkIG5hbWUsIHNldHRpbmcgaXQncyB2YWx1ZSB0byBcInZhbHVlXCIuXG4gICAgICogQGF1dGhvciB3M3NjaG9vbHNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gY29va2llTmFtZTogVGhlIG5hbWUgb2YgdGhlIGNvb2tpZSB0aGF0IHdlIHdhbnQgdG8gY3JlYXRlL3VwZGF0ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdmFsdWU6IFRoZSB2YWx1ZSB0byBhc3NpZ24gdG8gdGhlIGNvb2tpZS5cbiAgICAgKi9cbiAgICBzZXRDb29raWU6IGZ1bmN0aW9uKGNvb2tpZU5hbWUsIHZhbHVlKSB7XG4gICAgICAgIC8vIFNldCBhIGNvb2tpZSB3aXRoIG5hbWUgY29va2llIGFuZCB2YWx1ZSBjb29raWUgdGhhdCB3aWxsIGV4cGlyZSAzMCBkYXlzIGZyb20gbm93LlxuICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArICgzMCAqIDI0ICogNjAgKiA2MCAqIDEwMDApKTtcbiAgICAgICAgdmFyIGV4cGlyZXMgPSBcImV4cGlyZXM9XCIgKyBkLnRvVVRDU3RyaW5nKCk7XG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZU5hbWUgKyBcIj1cIiArIHZhbHVlICsgXCI7IFwiICsgZXhwaXJlcztcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIGdldFVybFBhcmFtcygpXG4gICAgICogQGF1dGhvciBHaWdhYnl0ZSBHaWFudCAoMjAxNSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsOiBUaGUgVVJMIHRvIGZldGNoIFVSTCBwYXJhbWV0ZXJzIGZyb21cbiAgICAgKi9cbiAgICBnZXRVcmxQYXJhbXM6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICB2YXIgdXJsUGFyYW1zID0ge307XG5cbiAgICAgICAgdmFyIHNwbGl0VXJsID0gdXJsLnNwbGl0KFwiP1wiKVsxXTtcblxuICAgICAgICBpZiAoc3BsaXRVcmwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIHRtcFVybFBhcmFtcyA9IHNwbGl0VXJsLnNwbGl0KFwiJlwiKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgdXBJbmQgPSAwOyB1cEluZCA8IHRtcFVybFBhcmFtcy5sZW5ndGg7IHVwSW5kKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgY3VyclBhcmFtU3RyID0gdG1wVXJsUGFyYW1zW3VwSW5kXTtcblxuICAgICAgICAgICAgICAgIHVybFBhcmFtc1tjdXJyUGFyYW1TdHIuc3BsaXQoXCI9XCIpWzBdXSA9IGN1cnJQYXJhbVN0ci5zcGxpdChcIj1cIilbMV1cbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcI1xcIS9nLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB1cmxQYXJhbXM7XG4gICAgfVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhdXRoZW50aWNhdGlvbjogcmVxdWlyZShcIi4vYXV0aGVudGljYXRpb24uanNcIiksXG4gICAgZ2VuZXJhbDogcmVxdWlyZShcIi4vZ2VuZXJhbC5qc1wiKVxufTsiXX0=
