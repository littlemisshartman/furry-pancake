/**
 * GradeScaleEditorDialog
 *
 * @author Jason Allred <jgallred86@gmail.com>
 */
define(['underscore',
    'backbone',
    'handlebars',
    'app/views/shared/popups/savingDialog',
    'app/views/shared/alert',
    'app/models/courseBuilder/gradingScale'],

    function(_, Backbone, Handlebars, SavingDialog, Alert, GradeScale) {

        function debugLog(str) {
            if(false) {
            	console.log(str);
            }
        }

        /**
         * View model for a single scale entry
         */
        var GsEntryViewModel = Backbone.LSModel.extend({
            defaults : function() {
                return {
                    letter : '',
                    value : ''
                }
            },
            validation : {
                letter : {required:true, msg:"You must provide a label for each row."},
                value : function(val){
                    if(_.isUndefined(val) || _.isNull(val) || _.isNaN(val) || (_.isString(val) && val.length === 0)) {
                        return "You must provide a value for each row."
                    }
                }
            }
        });

        /**
         * Collection of GsEntryViewModel. 
         */
        var GsEntryViewModelCollection = Backbone.LSCollection.extend({
            model : GsEntryViewModel,
            /**
             * Validates each individual view model. If they all pass then the scale integrity
             * is checked (values are descending, no duplicate labels, etc). Because we verify this
             * outside the view model, we must attach validation errors to the DOM directly, thus
             * there are assumptions made about the structure of the view. Since this is a view
             * model, it's not a complete violation of MVC.
             * @param viewType {GradeScale.type} The type to which the scale items belong. 
             * Facilitates validation error display
             * @return errors if any
             */
            validate : function(viewType) {
                var result = {}, errors = false;
                this.forEach(function(model){
                    var modelResult = model.validate();
                    if(modelResult) {
                        errors = true;
                        _.extend(result, modelResult);
                    }
                });
                
                if(errors) {
                    return result;
                } else {
                    // Now validate scale integrity
                    var prev, 
                        index = 0, 
                        viewRows = (viewType) ? $('.scaleTableBody.'+viewType+" tr:not(.top)"): null,
                        labelsInUse = {};
                        
                    this.forEach(function(model){
                        // Verify there are no duplicate labels
                        if(labelsInUse[model.get('letter')]){
                            errors = true;
                            result["letter:"+model.cid] = "You cannot have duplicate letters in your scale.";
                            
                            if(viewRows) {
                                $(viewRows[index]).find('.rowLetter').addClass('invalid').attr('data-error', result["letter:"+model.cid]);
                            }
                        } else {
                            labelsInUse[model.get('letter')] = true;
                        }
                        
                        if(prev) {
                            // Validate that values are descending
                            if(model.get('value') > prev.get('value')) {
                                errors = true;
                                result["value:"+model.cid] = model.get('letter')+" is greater than "+prev.get('letter');
                                // The nature of the UI validation binding is such that we can't access the view from the model
                                // So we have to do it manually. I know its bad practice.
                                if(viewRows) {
                                    if(index > 0) {
                                        if(!$(viewRows[index - 1]).find('.rowValue').hasClass('invalid')) {
                                            $(viewRows[index - 1]).find('.rowValue').addClass('invalid');
                                        }
                                    }
                                    $(viewRows[index]).find('.rowValue').addClass('invalid').attr('data-error', result["value:"+model.cid]);
                                }
                            }
                        }
                        prev = model;
                        index++;
                    });
                    if(errors) {
                        return result;
                    }
                }
            }
        });

        /**
         * Creates default values in a scale viewmodel collection
         * @param type {String} The GradeScale.type constant
         * @param collection {GsEntryViewModelCollection} Optional. If given, it will be 
         * reset with the default data. Otherwise a new collection will be created.
         * @return The new, or passed, collection that has been populated with default data
         */
        function make_default_scale(type, collection) {
            var entries = collection ? collection : new GsEntryViewModelCollection();

            switch(type) {
                case GradeScale.type.PERCENT:
                    entries.reset([{letter:'A', value:93},{letter:'A-', value:90},{letter:'B+', value:87},
                        {letter:'B', value:83},{letter:'B-', value:80},{letter:'C+', value:77},
                        {letter:'C', value:73},{letter:'C-', value:70},{letter:'D+', value:67},
                        {letter:'D', value:63},{letter:'D-', value:60},{letter:'E', value:0}]);
                    break;
                case GradeScale.type.POINTS:
					entries.reset([{letter:'A', value: ""},{letter:'A-', value:""},{letter:'B+', value:""},
                        {letter:'B', value:""},{letter:'B-', value:""},{letter:'C+', value:""},
                        {letter:'C', value:""},{letter:'C-', value:""},{letter:'D+', value:""},
                        {letter:'D', value:""},{letter:'D-', value:""},{letter:'E', value:0}]);
					break;
                case GradeScale.type.DISTRIBUTION:
                    entries = clear_scale(entries);
                    break;
            }

            return entries;
        }

        /**
         * Creates empty values in a scale viewmodel collection
         * @param collection {GsEntryViewModelCollection} Optional. If given, it will be 
         * reset with the empty data. Otherwise a new collection will be created.
         * @return The new, or passed, collection that has been populated with cleared data
         */
        function clear_scale(collection) {
            var entries = collection ? collection : new GsEntryViewModelCollection();

            entries.reset([{letter:'A', value:''},{letter:'A-', value:''},{letter:'B+', value:''},
                {letter:'B', value:''},{letter:'B-', value:''},{letter:'C+', value:''},
                {letter:'C', value:''},{letter:'C-', value:''},{letter:'D+', value:''},
                {letter:'D', value:''},{letter:'D-', value:''},{letter:'E', value:''}]);

            return entries;
        }

        /**
         * View model counterpart to the GradeScale. 
         */
        var GsViewModel = Backbone.LSModel.extend({
            initialize : function() {
                // Populate a default scale for each type.
                var scales = {}
                scales[GradeScale.type.POINTS] = make_default_scale(GradeScale.type.POINTS);
                scales[GradeScale.type.PERCENT] = make_default_scale(GradeScale.type.PERCENT);
                scales[GradeScale.type.DISTRIBUTION] = make_default_scale(GradeScale.type.DISTRIBUTION);
                this.set(scales, {silent:true, forceUpdate:true});
            },
            defaults : function() {
                return {
                    title : '',
                    type : GradeScale.type.PERCENT,
                    maxPoints : '',
                    isCourseScale : false
                }
            },
            validation : _.extend({}, GradeScale.prototype.validation, {
                maxPoints : function(val){
                    if(this.get('type') === GradeScale.type.POINTS) {
                        if(_.isUndefined(val) || _.isNull(val) || _.isNaN(val) || (_.isString(val) && val.length === 0)) {
                            return "You must provide a maximum point value for the scale."
                        } else {
                            var firstVal = this.get(GradeScale.type.POINTS).first();
                            if(firstVal.get('letter') && firstVal.get('value') || firstVal.get('value') === 0) {
                                if(firstVal.get('value') > val) {
                                    // The nature of the UI validation binding is such that we can't access the view from the model
                                    // So we have to do it manually. I know its bad practice.
                                    $('.scaleTableBody.'+GradeScale.type.POINTS+" tr:not(.top):first .rowValue").addClass('invalid');
                                    return firstVal.get('letter') + " is greater than " + val;
                                }
                            }
                        }
                    }
                }
            }),
            /**
             * Validates both this view model and the current scale's view models
             * @return errors if any
             */
            validateScale : function(){                
                // Validate the current scale type
                var scaleResult = this.get(this.get('type')).validate(this.get('type'));
                
                var result = this.validate();
                
                if(result) {
                    if(scaleResult){
                        return _.extend(result, scaleResult);
                    }
                    return result
                } else if(scaleResult) {
                    return scaleResult;
                }
            }
        });

        /**
         * Tanslates GradeScale to new a GsViewModel and back
         */
        var ViewModelTranslator = {
            /**
             * @param model {GradeScale}
             * @return {GsViewModel} A new instance
             */
            fromModel : function(model) {
                var data = _.pick(model.toJSON(), "title", "type", "maxPoints", "isCourseScale");
                if(!data.type) {
                    delete data.type;
                }
                if(!data.maxPoints) {
                    delete data.maxPoints;
                }
                var viewModel = new GsViewModel(data);
                if((model.id && model.get('items')) || !_.isEmpty(model.get('items'))) {
                    var items = model.get('items'), scale = [];
                    for(var letter in items){
                        scale.push({"letter":letter, "value":items[letter]});
                    }
                    viewModel.get(viewModel.get('type')).reset(scale);
                }
                return viewModel;
            },
            /**
             * @param viewModel {GsViewModel}
             * @return {GradeScale} A new instance
             */
            toModel : function(viewModel) {
                var model = new GradeScale(_.pick(viewModel.toJSON(), "title", "type", "maxPoints", "isCourseScale"));
                
                var scale = viewModel.get(viewModel.get('type')).toJSON(), items = {};
                for(var i in scale){
                    var item = scale[i];
                    items[item.letter] = item.value;
                }                
                model.set({"items":items}, {silent:true});
                return model;
            }
        }

        /**
         * View for an individual scale item
         */
        var GsEntryRow = Backbone.View.extend({
            initialize : function(options) {
                this.model.on('destroy', function(){
                    Backbone.Validation.unbind(this);
                    this.remove(); // Destroy the view when the model dies
                }, this);
                this.readonly = options.readonly;
                this.type = options.type;
            },
            tagName : 'tr',
            template : Handlebars.compile('<td>{{#unless readonly}}<a class="deleteScaleRow"></a>{{/unless}}</td>'
                +'<td><input type="text" class="rowLetter" size="4" maxlength="45" value="{{letter}}" {{#if readonly}}disabled{{/if}}>&nbsp;=</td>'
                +'<td><input type="number" class="rowValue" size="3" step="any" min="0" max="9999" value="{{value}}" {{#if readonly}}disabled{{/if}}></td>'
                +'<td class="scaleText">%</td>'),
            events : function() {
                return {
                    "blur .rowLetter" : "updateLetter",
                    "blur .rowValue" : "updateValue",
                    "click .deleteScaleRow" : "destroy"
                }
            },
            render : function() {
                Backbone.Validation.bind(this,{selector:{
                        'letter' : '.rowLetter',
                        'value' : '.rowValue'
                }});

                this.$el.html(this.template(_.extend({readonly:this.readonly}, this.model.toJSON())));

                if(this.type == GradeScale.type.POINTS) {
                    // Points doesn't display the % symbol
                    this.$('.scaleText').text('');
                }
                if(this.model.collection.length === 1) {
                    // Can't delete the last item
                    this.$('.deleteScaleRow').remove();
                }
                return this;
            },
            
            updateLetter : function(evt) {
                debugLog("update letter, value="+$(evt.target).val());
                this.model.set({letter:$(evt.target).val()}, {forceUpdate:true});
            },
            updateValue : function(evt) {
                debugLog("update value, value="+parseFloat($(evt.target).val()));
                this.model.set({value:parseFloat($(evt.target).val())}, {forceUpdate:true});
            },
            
            /**
             * Delete button handler
             */
            destroy : function() {
                this.model.destroy();
            }
        });

        /**
         * View of a whole scale. Supports adding to front and end of scale
         */
        var GsEntriesView = Backbone.View.extend({
            initialize : function(options) {
                this.model.on('destroy', function(){
                    this.remove(); // Destroy the view when the GsViewModel dies
                }, this);

                var type = this.model.get('type');
                // Hide/show self based on currently selected scale type
                this.model.on('change:type', function(model){
                    if(model.get('type') === type && !this.$el.is(':visible')) {
                        this.$el.show();
                    } else if(this.$el.is(':visible')) {
                        this.$el.hide();
                        this.$('.invalid,[data-error]').removeClass('invalid').removeAttr('data-error');
                    }
                }, this);

                this.collection.on('reset add remove', this.render, this);

                this.readonly = this.model.get('isCourseScale');
            },
            tagName : "tbody",
            points_template : Handlebars.compile('<tr class="top">'
                +'<td>{{#unless isCourseScale}}<a class="top addScaleRow btn btn-info">+</a>{{/unless}}</td><td></td>'
                +'<td><input type="number" class="maxPoints rowValue" size="3" step="any" value="{{maxPoints}}" {{#if isCourseScale}}readonly{{/if}}></td><td>Maximum</td>'
                +'</tr>'
                +'<tr class="bottom"><td></td><td></td><td></td><td></td></tr>'),
            default_template : Handlebars.compile('<tr class="top"><td>{{#unless isCourseScale}}<a class="top addScaleRow btn btn-info">+</a>{{/unless}}</td><td></td><td></td><td></td></tr>'
                +'<tr class="bottom"><td></td><td></td><td></td><td></td></tr>'),
            attributes : {
                "class" : "scaleTableBody"
            },
            events : function() {
                return {
                    "click .addScaleRow" : "addEntry",
                    "change .maxPoints" : "updateMaxPoints",
                    "keyup .maxPoints" : "updateMaxPoints"
                }
            },
            render : function() {
                switch(this.model.get('type')) {
                    case GradeScale.type.POINTS:
                        this.$el.html(this.points_template(this.model.toJSON()));
                        break;
                    default:
                        this.$el.html(this.default_template(this.model.toJSON()));
                        break;
                }

                this.$el.addClass(this.model.get('type'));

                var view = this;
                this.collection.forEach(function(model){
                    view.$('tr.bottom').before((new GsEntryRow({model:model, readonly:view.readonly, type:view.model.get('type')})).render().$el);
                });

				if(this.model.get('type') != "distrib") {
					// This disables editing the value for the bottom-most scale entry.
					this.$('.bottom').prev().find('.rowValue').prop('disabled', true);
				}
				// this takes away the delete button on the bottom row.
				this.$('.bottom').prev().find('.deleteScaleRow').detach();

                return this;
            },
            /**
             * Adds new scale items to front or back of collection
             */
            addEntry : function(evt) {
                var newRow = new GsEntryViewModel({type:this.model.get('type')});

                if( $(evt.target).hasClass('top') ) {
                    this.collection.unshift(newRow);
                } else {
                    this.collection.push(newRow);
                }
            },
            updateMaxPoints : _.debounce(function(evt) {
                debugLog("update MaxPoints, value="+parseFloat($(evt.target).val()));
                this.model.set({maxPoints:parseFloat($(evt.target).val())}, {forceUpdate:true});
            }, 500)
        });

        /**
         * View for all functional portions of the dialog. Supports title and type changes
         */
        var GsEditor = Backbone.View.extend({
            initialize : function() {
                this.model.on('change:type', this.showScaleForType, this);
                this.model.on('destroy', function(){
                    Backbone.Validation.unbind(this);
                    this.remove(); // Destroy the view when the GsViewModel dies
                }, this);
            },
            tagName : "table",
            attributes : {
                "class" : "gradeScaleEditor"
            },
            template : Handlebars.compile('<tbody>'
                    +'<tr>'
                        +'{{#unless isCourseScale}}<td><label id="gradeScaleScaleTitle_label" for="gradeScaleTitle" class="required">Title:</label></td>'
                        +'<td><input type="text" id="gradeScaleTitle" name="gradeScaleTitle" size="25" maxlength="50" value="{{title}}"></td>{{/unless}}'
                    +'</tr>'
                    +'<tr>'
                        +'<td><label id="gradeScaleScaleType_label" for="gradeScaleType" class="required">Scale:</label></td>'
                        +'<td>'
                            +'<select id="gradeScaleType" name="gradeScaleType" class="gradeScaleType" {{#if isCourseScale}}disabled{{/if}}>'
                                +'<option value="'+GradeScale.type.POINTS+'">Points</option>'
                                +'<option value="'+GradeScale.type.PERCENT+'">Percent</option>'
                                +'<option class="hidden" value="'+GradeScale.type.DISTRIBUTION+'" disabled>Distribution</option>'
                            +'</select>'
                        +'</td>'
                    +'</tr>'
                    +'<tr>'
                        +'<td colspan="2">'
                            +'<table class="scaleTable">'
                                +'<thead><tr><td></td><td>Grade</td><td class="scaleValueHeader" colspan="2">Points</td></tr></thead>'
                            +'</table>'
                        +'</td>'
                    +'</tr>'
                +'</tbody>'),
            events : function() {
                return {
                    'change #gradeScaleType' : "updateType",
                    'keyup #gradeScaleTitle' : "updateTitle"
                };
            },
            render : function() {
                this.$el.html(this.template(this.model.toJSON()));
                this.$('#gradeScaleType').val(this.model.get('type'));
                this.showScaleForType(this.model);
                return this;
            },
            
            updateType : function(evt) {
                debugLog("update type, value="+$(evt.target).val());
                this.model.set({type:$(evt.target).val()}, {forceUpdate:true});
            },
            updateTitle : _.debounce(function(evt) {
                debugLog("update title, value="+$(evt.target).val());
                this.model.set({title:$(evt.target).val()}, {forceUpdate:true});
            }, 500),

            /**
             * Lazily instantiates GsEntriesViews for the selected type. Updates the column
             * text for the appropriate type.
             * @param model {GsViewModel}
             */
            showScaleForType : function(model) {
                if(this.$('.scaleTableBody.'+model.get('type')).length === 0) { // Lazy render views
                    this.$('.scaleTable').append((new GsEntriesView({model:model, collection:model.get(model.get('type'))})).render().$el);
                }

                // Update thead
                switch(model.get('type')) {
                    case GradeScale.type.POINTS:
                        this.$('.scaleValueHeader').text('Points');
                        break;
                    case GradeScale.type.PERCENT:
                        this.$('.scaleValueHeader').text('Percent');
                        break;
                    case GradeScale.type.DISTRIBUTION:
                        this.$('.scaleValueHeader').text('Percent of students');
                        break;
                }
            }
        });

        /**
         * The dialog itself. Supports saving, closing, and reseting.
         */
        var GradeScaleEditor = SavingDialog.extend({
            id : "gradeScaleBox",

            title : "Grading Scale",

            events : function(){
                // Inherit parent events
                var evts = _.isFunction(SavingDialog.prototype.events) ?
                    SavingDialog.prototype.events.apply(this) : SavingDialog.prototype.events;

                return _.extend({}, evts, {
                    'click .reset' : "reset"
                });
            },

            render : function() {
				this.setPopupContent((new GsEditor({model: this.model})).render().$el);
				
				// Apparently, some browsers will not honor an option in a select
				// box being display: none;.  So, here we remove the distributive option
				// from the choices, unless it is already chosen.  This makes it so that
				// when you are viewing a distributive course gradescale, it shows that
				// it is distributive, but you cannot create distributive assignment scales.
				if(this.model.get('type') != "distrib") {
					this.$('[value="distrib"]').remove();
				}
				
				
                if(this.$('.submitPopup .reset').length == 0) {
                    // Add reset button
                    this.$('.submitPopup').prepend('<a class="reset cancel" style="float: left;">Clear</a>');
                }
                
                // Can't save or make changes to the course grade scale
                if(!this.model.get('isCourseScale')) {
                    this.$('.submitPopup').find('.reset,.acceptAction').show();
                } else {
                    this.$('.submitPopup').find('.reset,.acceptAction').hide();
                }
            
                return this;
            }, 
            
            /**
             * Reset button handler. Resets the model to a blank state and redraws.
             */
            reset : function() {
                this.model.set({
                    title : "",
                    type : GradeScale.type.POINTS,
                    maxPoints : ""
                }, {forceUpdate:true});
                clear_scale(this.model.get(GradeScale.type.POINTS));
                clear_scale(this.model.get(GradeScale.type.PERCENT));
                clear_scale(this.model.get(GradeScale.type.DISTRIBUTION));
                this.render();
            },

            /**
             * Opens this dialog. You can optionally pass in a new or existing model. If no
             * model is given, a default will be created.
             * @param aModel Optional. A new or existing model to edit
             */
            open : function(aModel) {
                var srcModel;

				if(aModel) { // Caller passed one arg
                    if(!(aModel instanceof GradeScale)) {
                        throw new Error("Unrecognized model passed to GradeScaleEditor open");
                    }
					srcModel = aModel;
				}

                if(!srcModel) {
                    srcModel = new GradeScale();
                } else if(srcModel.id) {
					debugLog("Edit model "+srcModel.id);
				}

                this.realModel = srcModel;

                this.model = ViewModelTranslator.fromModel(srcModel);

                SavingDialog.prototype.open.apply(this);

				if(!this.model.get('isCourseScale')){
                    this.$('#gradeScaleTitle')[0].focus();
                }
            },

            /** 
             * Validate and save the scale
             */
            save : function(){
                // 
                Backbone.Validation.bind(this, {selector:{
                        'title' : "#gradeScaleTitle",
                        'type' : "#gradeScaleType",
                        'maxPoints' : ".maxPoints"
                }});
            
                Alert.hideAlert();
                this.resetValidationErrors();
                
                if( this.model.validateScale() ){
                    Alert.showValidationErrors();
                    Backbone.Validation.unbind(this);
                    return;
                }
                
                Backbone.Validation.unbind(this);

                this.hidePrimaryButton();
                var view = this;

                try {
                    debugLog("Saving");
                    
                    var realScale = ViewModelTranslator.toModel(this.model);

                    if(this.realModel && !this.realModel.isNew()) { // Editing
                        realScale.set({'id':this.realModel.id}, {silent:true,forceUpdate:true});
                        realScale.save(null,
                            {success:function(model, jqXhr){
                                // copy attributes to originalModel
                                view.realModel.set(model.attributes, {forceUpdate:true});
                                view.trigger("saved", view, view.realModel);
                                view.close();
                                Alert.showAlert("info",{txt: "Grading Scale saved."});
                            }, error:function(model, jqXhr){
                                view.showPrimaryButton();
                                debugLog(jqXhr);
                                Alert.showAlert("error",{txt:"An error occured while saving the grading scale."});
                            }});
                    } else {
                        // New model
                        realScale.save(null,
                            {success:function(model, jqXhr){
                                view.trigger("saved", view, model);
                                view.close();
                                Alert.showAlert("info",{txt: "Grading Scale saved."});
                            }, error:function(model, jqXhr){
                                view.showPrimaryButton();
                                debugLog(jqXhr);
                                Alert.showAlert("error",{txt:"An error occured while saving the grading scale."});
                            }});
                    }
                } catch(e) {
                    var msg = e instanceof Error ? e.message : e;
                    debugLog("Error in GradeScaleEditor.save: "+msg);
                    debugLog("Model:");
                    debugLog(this.model);
                    if(e instanceof Error) {
                        debugLog(e.stack);
                    }
                    Alert.showAlert("error",{txt:"An error occured while saving the grading scale."});
                    this.showPrimaryButton();
                }
            },

            /**
             * Closes and resets the dialog
             */
            close : function() {
                SavingDialog.prototype.close.apply(this, arguments);                
                Backbone.Validation.unbind(this);
                Alert.hideAlert();
                this._removeModel();
                this.showPrimaryButton();
            },

            /**
             * Deletes model data on the editor
             */
            _removeModel : function() {
                // Stop listening to the model
                this.model.destroy();
                delete this.model;
                delete this.realModel;
            },
            
            /**
             * Removes validation error data from the DOM of the editor
             */
            resetValidationErrors : function() {
                this.$('.invalid,[data-error]').removeClass('invalid').removeAttr('data-error');
            }
        });

        return GradeScaleEditor;
    }
    );