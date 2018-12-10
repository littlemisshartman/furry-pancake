<template>
    <!-- User selects type of table. type selected should determine what kind of grade scale will be applied to the table -->
    <div class="typeSelector">
        <label class="required typeSelector">Scale:</label>
        <!--Displays a drop-down menu with these four options-->
        <select class="gradeScaleType verify-Field verify-ComboBoxChoice typeSelector" @change="onTypeChange">
            <option :selected="type === 'percent'"   value="percent"  >Percent      </option>
            <option :selected="type === 'rawPoints'" value="rawPoints">Points       </option>
            <option :selected="type === 'points'"    value="points"   >Scaled Points</option>
            <option :selected="type === 'distrib'"   value="distrib"  >Distribution </option>
        </select>
        <p>{{ displayMessage }}</p>
    </div>
</template>

<style scope>
    .typeSelector label {
        float: left;
        margin-right: 1em;
        margin-bottom: .5em;
    }
    .typeSelector select {
        margin-top: 20px;
    }

    .typeSelector {
        margin-top: 20px;
    }

</style>

<script>

define([], function() {
    return {
        props: {
            type: String,
            maxPoints: Number,
            possiblePoints: Number
        },
        methods: {
            //Emits the changed type to editor.
            onTypeChange: function(event) {
                var selectElement = event.target;
                var type = selectElement.options[selectElement.selectedIndex].value;
                this.$emit('changeType', type);
            }
        },
        computed: {
            //Displays a description under the drop-down list depending on the selected type.
            displayMessage: function() {
                if(this.type === "rawPoints") {
                    return "There are currently " + this.possiblePoints.toString() + " points possible in the course.";
                } else if(this.type === "points") {
                    return "There are currently " + this.possiblePoints.toString() + " points possible in the course." + " All scores will be scaled to " + this.maxPoints.toString() + " points (the maximum you've chosen here) for grade calculations."
                } else {
                    return "";
                }
            }
        }
    }
});

</script>