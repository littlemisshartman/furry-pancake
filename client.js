define([], function() {
    function Client() {
        return this;
    }
    
    Client.prototype.saveGradescale = function(gradeScale) {
        return ajax_promise(
            global_appID,
            "ajax/models/courseBuilder/gradingScale.php",
            '', // This is simply a file with functions, not a class
            '', // No constructor to pass parameters to
            false, // Not a page
            "update",
            gradeScale
        );
    };

    Client.prototype.changeCourseToUseTotalPoints = function() {
        return ajax_promise(
            global_appID,
            "controls/AssignmentGradeScaleEditor.php",
            '',
            '',
            false,
            "setCourseUseWeights",
            {useWeights: false}
        );
    };

    return Client;
});