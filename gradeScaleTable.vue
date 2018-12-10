<template>
    <div>
        <table><!-- SEE <LsForm>-->
            <thead>
                <!--Renders table headers depending on the selected type-->
                <tr>
                    <td>Grade</td>
                    <td v-if="type === 'percent'">Minimum Percent</td>
                    <td v-if="type === 'points' || type === 'rawPoints'">Points</td>
                    <td></td>
                </tr>
            </thead>
            <tbody class="gradeScaleTable">
                <!--Renders a Maximum row if the selected type is Scaled Points-->
                <tr v-if="type === 'points'">
                    <td class="maximum">Maximum</td>
                    <td id="maxPointsChange"><input type='number' 
                        :class="{invalid : !isMaxValid}" 
                        :value="maxPoints"
                        min="0"
                        step="any" 
                        @change="updateMaximumPoints($event.target.value)"
                    ></td>
                    <td>{{ maxValue }}</td>
                </tr>
                
                <!--Renders values A through E and their respective rows-->
                <tr v-for="letter in itemsOrder" :key="letter">
                    <th class="letterGrade">{{ letter }}</th>
                    <td id="inputChange">
                        <input type='number'
                            min=0
                            step="any" 
                            :value="items[letter]" 
                            @change="updateInput($event.target.value, letter)" 
                            :class="{ invalid: !isValid[letter] }"
                            :readonly="letter === 'E'"
                            id="{{ letter }}"
                            required="true"
                        />
                    </td>
                    <td>{{ typeValue[letter] }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
table tbody tr th {
    border: none;
    color: black;
    padding-left: .7em;
    padding-top: .7em;
    text-align: left;
}
td {
    padding: .5em;
}
table {
    margin-bottom: 1em;
}
.maximum {
    font-size: .9em;
}
</style>

<script>
define([], function() {
    return {
        props: {
            type: String,
            maxPoints: Number,
            possiblePoints: Number,
            items: Object,
            itemsOrder: Array
        },
        computed: {
            //Calculates the units of measurement of the value of the Grade Scale Type
            typeValue: function() {
                var obj = {};
                for (var i = 0; i < this.itemsOrder.length; i++) {
                    if (this.type === "percent") {
                        obj[this.itemsOrder[i]] = "%";
                    } 
                    else if (this.type === "points") {
                        var pointValue;
                        if(this.maxPoints === 0){
                            pointValue = 0;
                        } 
                        else {
                            pointValue = (this.items[this.itemsOrder[i]] / this.maxPoints * 100);
                        }
                        //Rounds to the maximum of two decimal points unless the value is a whole number.
                        obj[this.itemsOrder[i]] = (Math.round(pointValue * 100) /100).toString() + "%";
                    } 
                    else if (this.type === "rawPoints") {
                        obj[this.itemsOrder[i]] = "";
                    }
                    else {
                        obj[this.itemsOrder[i]] ="";
                    }
                };
                return obj;
            },

            /*Changes the typeValue of Maximum depending on the value of maxPoints. 
            If maxPoints is 0, tV will be 0%. If it is anything above that, tV will be 100%*/
            maxValue: function() {
                if(this.maxPoints == 0) {
                    return "0%";
                } 
                else {
                    return "100%";
                }
            },

            //
            invalidMessages: function() {
                var lastLetter;
                var lastLetterValue;
                var obj = {};

                if(this.type === 'percent') { //cannot put in higher than 100 if it's percent
                    lastLetter = "Maximum";
                    lastLetterValue = 100;
                }
                if(this.type === 'points') { //cannot put in higher than the specified maximum if Scaled Points
                    lastLetter = "Maximum";
                    lastLetterValue = this.maxPoints;
                    var maxPoints = this.maxPoints;
                   // var valueA = parseFloat(this.items[this.itemsOrder[0]]);
                    if (this.maxPoints < 0) {
                        obj["maxPoints"] = "Input must be a positive decimal value.";
                    } 
                    else {
                        obj["maxPoints"] = null;
                    }
                }
                if(this.type === 'rawPoints') { //cannot put in higher than is available if Points 
                    lastLetter = "Maximum";
                    lastLetterValue = this.possiblePoints;
                }

                for (var i = 0; i < this.itemsOrder.length; i++) {
                    var numberTest = parseFloat(this.items[this.itemsOrder[i]]);
                    if (Number.isNaN(numberTest)) {
                        obj[this.itemsOrder[i]] = "You have empty or invalid values.";
                    }
                    else if (parseFloat(this.items[this.itemsOrder[i]]) < 0) {
                        obj[this.itemsOrder[i]] = "Input must be a positive decimal value.";
                    }
                    else if (parseFloat(this.items[this.itemsOrder[i]]) > parseFloat(lastLetterValue)) {
                        if (lastLetter === "Maximum"){
                            if (this.type == "rawPoints") {
                                obj[this.itemsOrder[i]] = String(this.itemsOrder[i] + " is greater than the maximum points possible.");
                            }
                            else if (this.type == "points") {
                                obj[this.itemsOrder[i]] = String(this.itemsOrder[i] + " is greater than " + this.maxPoints + ".");
                            }
                            else if (this.type == "percent") {
                                obj[this.itemsOrder[i]] = String(this.itemsOrder[i] + " is greater than 100%.");
                            }
                        } 
                        else {
                            obj[this.itemsOrder[i]] = String(this.itemsOrder[i] + " is greater than " + lastLetter + ".");
                        }
                    } 
                    else {
                        obj[this.itemsOrder[i]] = null;
                    }
                    lastLetter = this.itemsOrder[i];
                    lastLetterValue = parseFloat(this.items[this.itemsOrder[i]]);
                };
                return obj;
            },

            //Tests to see if the input is valid
            isValid: function() {
                var obj = {};
                if (this.type == "type") {
                    if (this.invalidMessages["maxPoints"] != null)  {
                        obj["maxPoints"] = false;
                    }
                    else {
                        obj["maxPoints"] = true;
                    }
                }
                for (var i = 0; i < this.itemsOrder.length; i++) {
                    if (this.invalidMessages[this.itemsOrder[i]] != null) {
                        obj[this.itemsOrder[i]] = false;
                        if ((i > 0) && (this.items[this.itemsOrder[i]] > this.items[this.itemsOrder[i-1]])) {
                            obj[this.itemsOrder[i-1]] = false;
                        }
                    }
                    else {
                        obj[this.itemsOrder[i]] = true;
                    }
                }
                return obj;
            },

            //Tests whether the value of A is greater than maxPoints, which should never be the case. If the case, Maximum will be shown as invalid as well.
            isMaxValid: function() {
                if (this.type != 'points') {
                    return true;
                }
                var maxPoints = this.maxPoints;
                var valueA = parseFloat(this.items[this.itemsOrder[0]]);
                if (this.maxPoints < 0) {
                    return false;
                }
                else if (maxPoints < valueA) {
                    return false; 
                }
                else {
                    return true;
                }
            },

            //iterates through the object created in isValid. if any grade is invalid, will return false.
            isObjValid: function() {
                var obj = this.isValid;
                for(var letter in obj) {
                    if (obj[letter] != true) {
                        
                        return false;
                    }
                }
                return true;
            }
        },
        methods: {
            //Emits the changed value to editor and checks if it's valid and sends result of validity test to editor.
            updateInput: function(value, letter) {
                this.$emit('newVal', value, letter);
                this.$nextTick(this.updateIsValid);
                this.$emit('invalidMessages', this.invalidMessages);
            },
            
            //Emits the changed value of maxPoints to editor.
            updateMaximumPoints: function(maxPoints) {
                this.$emit('newMax', maxPoints);
                this.$nextTick(this.updateIsValid);
                this.$emit('invalidMessages', this.invalidMessages);
            },

            //
            updateIsValid: function () {
                this.$emit('isValid', this.isObjValid && this.isMaxValid);
            }
        },
        
        mounted() {
            this.$emit('isValid', this.isMaxValid && this.isObjValid);
            this.$emit('invalidMessages', this.invalidMessages);
        },
        beforeUpdate() {
            this.$emit('isValid', this.isMaxValid && this.isObjValid);
            this.$emit('invalidMessages', this.invalidMessages);
        }
    }
});
</script>