jQuery(function($){
	var theFormCriteria    = 'form.autovalidate';
	var watermarkCriteria  = '.watermark[title]';
	var watermarkClass     = 'watermarked';
	
	var theFieldCriteria   = [];
	var theFieldTypes      = 'input textarea select'.split(' ');
	var theFieldClasses    = ['required'];
	var theFieldAttributes = 'mustmatch mustnotmatch minvalue maxvalue minlength minchosen maxchosen validateas'.split(' ');

	$.each( theFieldTypes, function(_,inFieldType){
		$.each( theFieldClasses, function(_,inFieldClass){
			theFieldCriteria.push( inFieldType+"."+inFieldClass );
		});
		$.each( theFieldAttributes, function(_,inFieldAttribute){
			theFieldCriteria.push( inFieldType+"["+inFieldAttribute+"]" );
		});
	});
	theFieldCriteria = theFieldCriteria.join(',');
	
	var theFailedValidationClass = 'has-error';
	var theFieldClassSetter = function( inJField, inClassName, inKeepFlag,errorMsg )
	{
		var holderGroup=inJField.parent('.form-group,.input-group');
			if(holderGroup.length)
			{
				inKeepFlag?holderGroup.addClass(inClassName ):holderGroup.removeClass( inClassName );
				errorHolder=holderGroup.find('.errorHolder');
			}
			
			if(errorHolder&&errorHolder.length)inKeepFlag?errorHolder.html(errorMsg).show():errorHolder.hide();
			else 
			{
				inJField.attr('data-toggle','tooltip').attr('data-placement','bottom');
				
				if(inKeepFlag)
				{
					inJField.tooltip('hide').attr('data-original-title', errorMsg).tooltip('fixTitle').tooltip('show');
				}
				else
				{	
					inJField.tooltip('hide').attr('data-original-title', '').tooltip('fixTitle');
				}
				
				
			}
	}

	var theFieldValidator = function(inEventOrField)
	{
		var theField  = inEventOrField.target || inEventOrField;
		var theJField = $(theField);
		var theJForm  = $(theField.form);
		if ( theJField.data('blessedBox') ){
			return theWatcher( theJField.data('blessedBox') );
		}

		var required     = theJField.hasClass('required');
		var mustMatch    = theJField.attr("mustmatch");
		var mustNotMatch = theJField.attr("mustnotmatch");
		var minVal       = theJField.attr("minvalue");
		var maxVal       = theJField.attr("maxvalue");
		var minLen       = theJField.attr("minlength");
		var maxLen       = theJField.attr("maxlength") && theJField.attr("maxlength") >= 0 && theJField.attr("maxlength");
		var minChosen    = theJField.attr("minchosen");
		var maxChosen    = theJField.attr("maxchosen");
		var valAs	       = theJField.attr("validateas");
		var valMsg       = theJField.attr("mustmatchmessage");

		// Clear validation errors on myself (and maybe related checkboxes)
		theFieldClassSetter( theJField, theFailedValidationClass, false );
		
		if ( theJField.data('siblingBoxes') )
		{
			theJField.data('siblingBoxes').each(function(_,inSiblingBox){
				theFieldClassSetter( $(inSiblingBox), theFailedValidationClass, false );
			});
		}		
		var theValidationErrorsByName = theJForm.data( 'validationErrorsByName' );
		delete theValidationErrorsByName[ theField.name ]; // Later checkboxes or radio buttons blow away earlier; validation options on LAST item

		var theValue = (theJField.is(watermarkCriteria) && theJField.hasClass(watermarkClass)) ? '' : theField.value;
		if (theField.type=='radio'){
			theValue = theJForm.find("input[name="+theField.name+"]:checked").val() || "";
		}
		
		var niceName = theJField.attr("nicename") || theField.name.replace(/_/g,' ');

		if (valAs){
			switch( valAs.toLowerCase() ){
				case 'email':
					mustMatch='^[^@ ]+@[^@. ]+\\.[^@ ]+$';
					if (!valMsg) valMsg = niceName+" doesn't look like a valid email address. It must be of the format 'john@host.com'";
				break;
				case 'phone':
					mustMatch='^\\D*\\d*\\D*(\\d{3})?\\D*\\d{3}\\D*\\d{4}\\D*$';
					if (!valMsg) valMsg = niceName+" doesn't look like a valid phone number.";
				break;
				case 'zipcode':
					mustMatch='^\\d{5}(?:-\\d{4})?$';
					if (!valMsg) valMsg = niceName+" doesn't look like a valid zip code. It should be 5 digits, optionally followed by a dash and four more, e.g. 19009 or 19009-2314";
				break;
				case 'integer':
					mustMatch='^-?\\d+$';
					if (!valMsg) valMsg = niceName+" must be an integer.";
				break;
				case 'float':
					mustMatch='^-?(?:\\d+|\\d*\.\\d+)$';
					if (!valMsg) valMsg = niceName+" must be a number, such as 1024 or 3.1415 (no commas are allowed).";
				break;				
			}
		}

		var errors = [];

		// TODO: support requiring radio buttons
		if (required && !theValue)
		{
			errors.push(
				theJField.attr('requiredmessage') ||
				(theJForm.attr('requiredmessage') && theJForm.attr('requiredmessage').replace(/%nicename%/gi,niceName)) ||
				(niceName+' is a required field.')
			);
		}

		if (mustMatch && theValue)
		{
			mustMatch = new RegExp(mustMatch,(theJField.attr('mustmatchcasesensitive')=='true'?'':'i'));
			if (!mustMatch.test(theValue)) errors.push( valMsg || (niceName+' is not in a valid format.') );
		}

		if (mustNotMatch && theValue)
		{
			mustNotMatch=new RegExp(mustNotMatch,(theJField.attr('mustmatchcasesensitive')=='true'?'':'i'));
			if (mustNotMatch.test(theValue)) errors.push( valMsg || (niceName+' is not in a valid format.') );
		}

		if (minVal && theValue && (theValue*1 < minVal*1)) errors.push( niceName+' may not be less than '+minVal+'.' );
		if (maxVal && theValue && (theValue*1 > maxVal*1)) errors.push( niceName+' may not be greater than '+maxVal+'.' );
		if (minLen && (theValue.length < minLen*1 ) && (required || theValue)) errors.push( niceName+' must have at least '+minLen+' characters.' );
		if (maxLen && (theValue.length > maxLen*1))errors.push( niceName+' may not be more than '+maxLen+' characters (it is currently '+theValue.length+' characters).' );
		

		if (valAs=='date' && theValue)
		{
			var curVal = new Date(theValue);
			if (isNaN(curVal)) errors.push( niceName+' must be a valid date (e.g. 12/31/2001)' );
			//TODO: format the dates nicely, e.g. #M#/#D#/#YYYY#
			if (minVal && ((new Date(minVal)) > curVal)) errors.push( niceName+' must be later than '+new Date(minVal)+'.' );
			if (maxVal && ((new Date(maxVal)) < curVal)) errors.push( niceName+' must be earlier than '+new Date(maxVal)+'.' );
		}

		if (minChosen || maxChosen)
		{
			var theNumChosen;
			if ( theField.type=='checkbox' ){
				theNumChosen = theJForm.find( "input[name='"+theField.name+"']:checked" ).length;
			} else if ( theField.options ){
				theNumChosen = theJField.find( 'option:selected' ).length;
			}
			if (theNumChosen<minChosen) errors.push( 'Please choose at least '+minChosen+' '+niceName );
			if (theNumChosen>maxChosen) errors.push( 'Please choose no more than '+maxChosen+' '+niceName );
		}
		
		if (errors.length)
		{
			theValidationErrorsByName[theField.name] = {el:theField, message:errors.join("\n") };
			theFieldClassSetter( theJField, theFailedValidationClass, true ,errors[0]);
			if ( theJField.data('siblingBoxes') )
			{
				theJField.data('siblingBoxes').each(function(_,inSiblingBox){
					theFieldClassSetter( $(inSiblingBox), theFailedValidationClass, true,error[0] );
				});
			}
		}
	}
	
	var theInitializer = function(_,inForm)
	{
		inForm = $(inForm);
		inForm.data( "validationErrorsByName", {} );

		// Walk by index instead of using .find() for speed and to track ordering
		for (var i=0,len=inForm[0].elements.length;i<len;i++)
		{
			var theField = $(inForm[0].elements[i]);
			if (theField.is(watermarkCriteria)) (function(f)
			{
				var mark = f.attr('title');
				f.focus(function(){
					if (f.val()==mark) f.removeClass(watermarkClass).val('');
				}).blur(function() {
					if (!f.val()) f.addClass(watermarkClass).val(mark);
				}).blur();
			})(theField);
			
			if (theField.is(theFieldCriteria) || ( theField.attr('maxlength') && theField.attr('maxlength') >= 0 ) )
			{
				theField.data('nativeIndex',i);
				if (theField[0].type=='checkbox' || theField[0].type=='radio')
				{
					var theSiblings = $(theField.form).find("input[name='"+theField.name+"']:"+theField[0].type).not(theField);
					theSiblings.data('blessedBox',theField[0]);
					theSiblings.add(theField).click(theFieldValidator);
					theField.data('siblingBoxes',theSiblings);
				}
				else 
				{
					theField.blur(theFieldValidator);
					theField.change(theFieldValidator);
				}
			}
		}

		inForm.submit(function(inEvent)
		{
			for (var i=0,len=inForm[0].elements.length;i<len;i++)
			{
				theFieldValidator(inForm[0].elements[i] );
			}
	
			var theValidationErrors = [];
			$.each(inForm.data('validationErrorsByName'),function(_,inFieldErrors)
			{
				theValidationErrors.push(inFieldErrors);
			});
	
			if (theValidationErrors.length)
			{
				theValidationErrors.sort(function(e1,e2){
					e1 = e1.el.tabIndex*1000 + $(e1.el).data('nativeIndex');
					e2 = e2.el.tabIndex*1000 + $(e2.el).data('nativeIndex');
					return e1<e2?-1:e1>e2?1:0;
				});
				var theErrorList = $.map(theValidationErrors,function(inError){
					return inError.message;
				}).join("\n");
				
				if(inForm.attr('alertError'))alert(theErrorList);
				var theFirstField = theValidationErrors[0].el;
				try{ theFirstField.focus();	 } catch(e){};
				try{ theFirstField.select(); } catch(e){};
				inEvent.cancelFurtherSubmits=true;
				inEvent.preventDefault();
				inEvent.stopPropagation();
				return false;
			}

			return true;
		});
	};

	$(theFormCriteria).each( theInitializer);
	$(document).bind('DOMNodeInserted',function(inEvent){
		$(inEvent.target).find(theFormCriteria).andSelf().filter(theFormCriteria).each(theInitializer);
	});
	
});
