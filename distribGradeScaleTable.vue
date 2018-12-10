<template>
    <div>
        <table v-if="type==='distrib'">
            <thead>
                <tr>
                    <td>Grade</td>
                    <td>Percent of Students</td>
                    <td></td>
                </tr>
            </thead>
            <tbody class="gradeScaleTable">
                <tr v-for="letter in itemsOrder" :key="letter" :value="items[letter]">
                    <th>{{ letter }}</th> 
                    <td id="inputChange" >
                        <input 
                            type='number' 
                            min="0" 
                            step="any" 
                            :value="items[letter]" 
                            @change="updateInput($event.target.value, letter)"
                        />
                    </td>
                    <td>%</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
table th {
    border: none;
    color: black;
    padding-left: .7em;
    padding-top: .7em;
}
td {
    padding: .5em;
}
table {
    margin-bottom: 1.5em;
}
</style>

<script>
define([], function() {
    return {
        props: {
            type: String,
            items: Object,
            itemsOrder: Array
        },
        computed : {
            invalidMessages: function() {
                var total = 0;
                var obj = {"key": null};
                for (var i = 0; i < this.itemsOrder.length; i++) {
                    if (this.items[this.itemsOrder[i]] < 0) {
                        //console.log("Negative values not allowed.");
                        obj[i] = "Input must be a positive decimal value.";
                        console.log(obj);
                        return obj;
                    }
                    total = total + parseFloat(this.items[this.itemsOrder[i]]);
                }
                if (total > 100) {
                    //console.log("Your distribution is less/greater than 100%. Current distribution is " + total + "%.");
                    obj["key"] = "Your distribution is greater than 100%. Current distribution is " + total + "%.";
                    console.log(obj);
                    return obj;
                } else if (total < 100) {
                    obj["key"] = "Your distribution is less than 100%. Current distribution is " + total + "%.";
                    console.log(obj);
                    return obj;
                }
                else {
                    //obj["key"] = null;
                    //console.log("Your distribution is 100%.");
                    console.log(obj);
                    return obj;
                }
            },
            //Adds all the values. If they do not equal 100, should not allow submission.
            isValid: function() {
                var total = 0;
                for (var i = 0; i < this.itemsOrder.length; i++) {
                    if (this.items[this.itemsOrder[i]] < 0) {
                        console.log("Negative values not allowed.");
                        return false;
                    }
                    total = total + parseFloat(this.items[this.itemsOrder[i]]);
                };
                if (total != 100) {
                    console.log("Your distribution is less/greater than 100%. Current distribution is " + total + "%.");
                    return false;
                }
                else {
                    console.log("Your distribution is 100%.");
                    return true;
                }
            }
        },
        methods: {
            //Emits the changed letter value to editor parent
            updateInput: function(value, letter) {
                this.$emit('newDistrib', value, letter);
                this.$emit('isValid', this.isValid);
                console.log(this.invalidMessages);
                this.$emit('invalidMessages', this.invalidMessages);
            }
        },
        mounted() {
            this.$emit('isValid', this.isValid);
            this.$emit('invalidMessages', this.invalidMessages);
        },
        beforeUpdate() {
            this.$emit('isValid', this.isValid);
            this.$emit('invalidMessages', this.invalidMessages);
        }
    }
});

</script>