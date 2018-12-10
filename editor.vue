<template>
    <div>
        <GradeScaleTypeSelector 
            :type="type" 
            :maxPoints="maxPoints" 
            :possiblePoints="possiblePoints" 
            @changeType="updateType"
        />
        <GradeScaleTable 
            v-if="type !== 'distrib'" 
            :type="type" 
            :maxPoints="maxPoints" 
            :possiblePoints="possiblePoints" 
            :items="items[type]"
            :itemsOrder="itemsOrder"
            @newMax="updateMaximumPoints" 
            @newVal="updateValue"
            @isValid="updateIsValid"
            @invalidMessages="invalidMessages"
        />
        <DistribGradeScaleTable 
            v-if="type === 'distrib'" 
            :type="type" 
            :items="items[type]"
            :itemsOrder="itemsOrder"
            @newDistrib="updateValue"
            @isValid="updateIsValid"
            @invalidMessages="invalidMessages"
        />
        
        <a class="cancel back" @click="handleBack" title="Back to the previous page">Back</a>
        <a class="action next" @click="sendGradeScaleObject" title="Save and continue to the next page" >Save and Continue</a>
        <div>
            <LsDialog 
                :open="confirmOpen" 
                title="Weighted categories" 
                @close="closeBox"
                @accept="handleAccept"
                @cancel="handleCancel"
                :accept="{text: 'Change to total points', render: true}"
                :cancel="{text: 'Use a different gradescale', render: true}"
            >
                Learning Suite does not allow using a points gradescale in a course which uses weighted categories. 
                Would you like to change the course to use the total points calculation method or use a different gradescale?
            </LsDialog>
        </div>
    </div>
</template>
<script>
define(['vue',
        'underscore',
        'app/components/components',
        'vuec!app/views/controls/gradescaleEditor/typeSelector',
        'vuec!app/views/controls/gradescaleEditor/gradeScaleTable',
        'vuec!app/views/controls/gradescaleEditor/distribGradeScaleTable'
        ], function(Vue, _, BaseComponents, GradeScaleTypeSelector, GradeScaleTable, DistribGradeScaleTable) {
    return {
        components: {
            GradeScaleTypeSelector: GradeScaleTypeSelector,
            GradeScaleTable: GradeScaleTable,
            DistribGradeScaleTable: DistribGradeScaleTable
        },
        data: function() {
            return {
                id: "",
                courseID: "",
                instructorID: "",
                title: "",
                type: "percent",
                maxPoints: 0,
                possiblePoints: 0,
                isValid: true,
                confirmOpen: false,
                items: {
                    percent: {
                        "A" : 93,
                        "A-": 90,
                        "B+": 87,
                        "B" : 83,
                        "B-": 80,
                        "C+": 77,
                        "C" : 73,
                        "C-": 70,
                        "D+": 67,
                        "D" : 63,
                        "D-": 60,
                        "E" : 0 
                    },
                    rawPoints: {
                        "A" : 0,
                        "A-": 0,
                        "B+": 0,
                        "B" : 0,
                        "B-": 0,
                        "C+": 0,
                        "C" : 0,
                        "C-": 0,
                        "D+": 0,
                        "D" : 0,
                        "D-": 0,
                        "E" : 0 
                    },
                    points: {
                        "A" : 930 ,
                        "A-": 900 ,
                        "B+": 870 ,
                        "B" : 830 ,
                        "B-": 800 ,
                        "C+": 770 ,
                        "C" : 730 ,
                        "C-": 700 ,
                        "D+": 670 ,
                        "D" : 630 ,
                        "D-": 600 ,
                        "E" : 0 
                    },
                    distrib: {
                        "A" : 4 ,
                        "A-": 5 ,
                        "B+": 7 ,
                        "B" : 9 ,
                        "B-": 12 ,
                        "C+": 13 ,
                        "C" : 13 ,
                        "C-": 12 ,
                        "D+": 9 ,
                        "D" : 7 ,
                        "D-": 5 ,
                        "E" : 4 
                    }
                },
                itemsOrder: ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"],
                isCourseScale: true,
                courseUsesWeighted: false,
                invalidMessagesList: []
            };
        },
        methods: {
            //Updates the value of type when emitted by typeSelector
            updateType: function(type) {
                var pastType = this.type;
                this.type = type;
                var _this = this;
                if (type == "rawPoints" && this.courseUsesWeighted) {
                    this.confirmOpen = true;
                    Vue.nextTick().then(function () {
                        _this.type = pastType;
                        return;
                    });
                }
                else this.type = type;
            },
            handleBack: function () {
                setFieldValue("redirect", "back", true);
            },
            handleAccept: function () {
                var _this = this;
                this.client.changeCourseToUseTotalPoints().then(function(ret) {
                    console.log(ret);
                    _this.courseUsesWeighted = false;
                    _this.confirmOpen = false;
                    _this.type = "rawPoints";
                })
            },
            handleCancel: function () {
                this.confirmOpen = false;
            },
            invalidMessages: function (invalidMessagesList) {
                this.invalidMessagesList = [];

                if (this.type == "points") {
                    var letterMessage = invalidMessagesList["maxPoints"];
                    if (letterMessage != null) {
                        var alertMessage = {txt: letterMessage};
                        this.invalidMessagesList.push(alertMessage);
                    }
                }
                /*if (this.type == "distrib") {
                    var keys = Object.keys(invalidMessagesList);
                    for (var i = 0; i < keys.length; i++) {
                        var letterMessage = invalidMessagesList[keys[i]];
                        if (letterMessage != null) {
                            var alertMessage = {txt: letterMessage};
                            this.invalidMessagesList.push(alertMessage);
                        }
                    }
                }
                else {*/
                var keys = Object.keys(invalidMessagesList);
                for (var i = 0; i < keys.length-1; i++) {
                    var letterMessage = invalidMessagesList[this.itemsOrder[i]];
                    if (letterMessage != null) {
                        var alertMessage = {txt: letterMessage};
                        this.invalidMessagesList.push(alertMessage);
                    }
                }
                //}
            },
            closeBox: function() {
                this.confirmOpen = false;
            },
            //Updates the items object when emitted by gradeScaleTable
            updateValue: function(value, letter) {
                this.$set(this.items[this.type], letter, parseFloat(value));
            },
            //sends the result of logic tests to editor every time the values are updated
            updateIsValid : function(isValid) {
                this.isValid = isValid;
            },
            //Updates the value of maxPoints when emitted by gradeScaleTable
            updateMaximumPoints: function(maxPoints) {
                this.maxPoints = parseFloat(maxPoints);
            },
            //Puts all data into an object when 'Save and Continue' button is selected.
            sendGradeScaleObject: function() {
                var _this = this;
                var pastType = this.type;
                if (this.isValid == false) {
                    showAlert("error", this.invalidMessagesList);
                    console.log("This is not a valid grade scale.");
                } else {
                    if (this.type == "rawPoints" && this.courseUsesWeighted == true) {
                        this.confirmOpen = true;
                        if (this.type == "rawPoints" && this.courseUsesWeighted) {
                            this.confirmOpen = true;
                            Vue.nextTick().then(function () {
                                _this.type = pastType;
                            });
                        }
                    } else {
                        var gradeScaleObject = {}; 
                        gradeScaleObject.items = this.items[this.type];
                        gradeScaleObject.title = this.title;
                        gradeScaleObject.type = this.type;
                        gradeScaleObject.maxPoints = this.maxPoints;
                        gradeScaleObject.isCourseScale = this.isCourseScale;
                        gradeScaleObject.id = this.id;
                        this.client.saveGradescale(gradeScaleObject).then(function (ret) {
                            console.log(ret);
                            showAlert("info", "Gradescale has been saved successfully.");
                            //setFieldValue("redirect", "forward", true);

                        }).catch(function () {
                            showAlert("error", "Ajax call failed.");
                        });
                        
                    }
                }
            }
        }
    };
});
</script>