function LazyProject(name, jsURL, dateMonth, dateYear, controlsData) {
    let _project = null;

    this.resolve = function() {
        return new Promise(function(resolve, reject) {
            // Check if project already resolved
            if (_project != null) return _project;

            // Make request
            $.ajax({
                dataType: "script",
                url: jsURL,
                success: successFun,
                error: errorFun
            });

            // If script request failed
            function errorFun(jqXHR, textStatus, errorThrown) {
                reject(errorThrown);
            }

            // If script request succeeded
            function successFun(data) {
                // Execute script and collect generated tick function
                let tickFunction = new Function('"use strict";' + data)();

                // Generate controls
                let controls = generateControls(controlsData);

                // Create new project and cache
                _project = new Project(name, dateMonth, dateYear, controls, tickFunction);

                // Pass up
                resolve(_project);
            }
        });
    }
}

function Project(name, dateMonth, dateYear, controls, tickFunction) {
    this.name = name;
    this.date_month = dateMonth;
    this.date_year = dateYear;
    this.controls = controls;
    this.tickFunction = tickFunction;

    this.start = function (canvas) {
        let instance = new ProjectInstance(this, canvas);
        instance.start();
        return instance;
    }
}

function ProjectInstance(project, canvas) {
    let animationOrigin = null;
    let animationHandler = null;
    let stopHandler = () => {};

    // Runs once per tick and passes all data through to project
    function tickProject(dt) {
        if (animationOrigin == null) {
            animationOrigin = dt;
        }

        let done = project.tickFunction(canvas, project.controls, dt - animationOrigin);

        if (!done) {
            // Queue next loop
            animationHandler = requestAnimationFrame(tickProject);
        } else {
            // Clear this and trigger the next action
            animationHandler = null;
            stopHandler();
        }
    }

    this.start = function () {
        this.stop();

        // Force trigger first loop
        animationHandler = requestAnimationFrame(tickProject);
    };

    this.stop = function () {
        if (animationHandler != null) {
            cancelAnimationFrame(animationHandler);
            animationHandler = null;
        }
    };

    this.setStopHandler = function (handler) {
        stopHandler = handler;
    }
}

// Parse json into lazy project
function generateProject(data) {
    return new LazyProject(data["name"], data["js_url"], data["date_month"], data["date_year"], data["controls"])
}

// Loop through json data and extract lazy projects
function generateProjects(data) {
    let projects = [];

    for (let i = 0; i < data.length; i++) {
        let projectData = data[i];
        projects.push(generateProject(projectData));
    }

    return projects;
}

// Returns a promise of a set of lazy projects
function getProjects() {
    return new Promise(function(resolve, reject) {
        // Make request
        $.ajax({
            dataType: "json",
            url: "projects.json",
            success: successFun,
            error: errorFun
        });

        // If data request failed
        function errorFun(jqXHR, textStatus, errorThrown) {
            reject(errorThrown);
        }

        // If data request succeeded
        function successFun(data) {
            resolve(generateProjects(data["projects"]));
        }
    });
}
