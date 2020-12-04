// general regex
const mi_open = '<m[ion]( *[a-z]+ *= *"[-# a-z]+")*>';
const mi_open_nattr = '<m[ion](?: *[a-z]+ *= *"[-# a-z]+")*>';
const mo_invis = '(<mo>&(?:(?:#x206[0-9])|(?:i[ct]));</mo>)*';
const mo_invis_nattr = '(?:<mo>&(?:(?:#x206[0-9])|(?:i[ct]));</mo>)*';
const mi_close = '</m[ion]>';
const space = '[\s \t\r\n]*';
const special_regex = /&[#a-zA-Z0-9]+;/g

// apply various functions to clean up mathml code from word paste
function format_mathml() {
	let word_mathml = document.getElementById("word").value;
	// fix word-generated mathml tags
	let paste_mathml = word_mathml.replaceAll("mml:", "").replaceAll(' xmlns:mml="http://www.w3.org/1998/Math/MathML" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"', "").replaceAll(" ", " ").replaceAll("&#xA0", " ");
	// remove extra spaces, as well as mspaces for now
	paste_mathml = rm_extra_space(paste_mathml).replaceAll(/ *<mspace *\/ *>/g, "<mi> </mi>");
	// get array of multicharacter words
	let multichar_arr = document.getElementById("multichar").value.split("\n");
	// fix multicharacter words
	let paste_mathml_multichar = join_multichar_mi(paste_mathml, multichar_arr);
	// add in mspace
	let replace_mspace_regex = new RegExp(mi_open + ' *' + mi_close, "g");
	let paste_mathml_multichar_mspace = paste_mathml_multichar.replaceAll(replace_mspace_regex, "<mspace />");
	// paste_mathml_multichar_var = join_mi_star(paste_mathml_multichar_var, multichar_arr)
	document.getElementById("paste").value = paste_mathml_multichar_mspace;
}

/* helper functions */

// assign type priorities
function type_prio(x) {
	if (x.type === "m") {
		return 0;
	}
	if (x.type === "c") {
		return 0;
	}
	if (x.type === "a") {
		return 1;
	}
	if (x.type === "v") {
		return 1;
	}
	if (x.type === "f") {
		return 1;
	}
}

// compare words
function sort_words(a, b) {
	// if two words are treated the same, sort by length in reverse
	if (type_prio(a) === type_prio(b)) {
		return a.val.length - b.val.length;
	}
	return type_prio(b) - type_prio(a);
}

// join consecutive mi into * - wip
function join_mi_star(mathml_text) {
	let mi_star_regex = new RegExp(mi_close + mo_invis + space + mi_open + '\*' + mi_close, "g");
	return mathml_text.replaceAll(mi_star_regex, "*</mi>");
}

// join consecutive mi for words in list
function join_multichar_mi(mathml_text, multichar_list) {
	let multichar_mathml_text = mathml_text;
	// get list of objects containing word value and type of word
	let word_arr = [];
	for (i = 0; i < multichar_list.length; i++) {
		let multichar_word = multichar_list[i].trim();
		if (multichar_word.length > 2) {
			let multichar_val = multichar_word.substring(0, multichar_word.length - 2).trim();
			let multichar_type = multichar_word.substring(multichar_word.length - 1, multichar_word.length);
			word_arr.push({val: multichar_val, type: multichar_type});
		}
	}
	// sort list of words by what to do with them
	word_arr.sort(sort_words).reverse();
	// loop through each word
	for (i = 0; i < word_arr.length; i++) {
		let curr_word = word_arr[i];
		// get values and indices of entities
		let special_char_vals = curr_word.val.match(special_regex);
		if (special_char_vals === null) {
			special_char_vals = [];
		}
		// loop through entities one by one and get their indices
		let curr_word_no_special = curr_word.val
		let special_char_inds = []
		for (j = 0; j < special_char_vals.length; j++) {
			let curr_special_val = special_char_vals[j];
			let special_val_ind = curr_word_no_special.indexOf(curr_special_val);
			special_char_inds.push(special_val_ind);
			curr_word_no_special = curr_word_no_special.replace(curr_special_val, " ");
		}
		// split word up to individual characters and add entities back in
		let multichar_arr = curr_word_no_special.split("");
		for (j = 0; j < special_char_inds.length; j++) {
			let curr_ind = special_char_inds[j];
			let curr_val = special_char_vals[j];
			multichar_arr[curr_ind] = curr_val;
		}
		// escape regex characters
		for (j = 0; j < multichar_arr.length; j++) {
			multichar_arr[j] = replace_regex_chars(multichar_arr[j]);
		}
		// join characters with regex for <mi> and invisible tags to find instances
		let mi_split_str = "(?:" + mi_close + mo_invis_nattr + space + mi_open_nattr + ")*";
		let mi_regex = new RegExp(mi_open + multichar_arr.join(mi_split_str) + mi_close, "g");
		// for multi-char, also look for instances where the last character contains a superscript/subscript
		let main_char_regex = mi_open + multichar_arr.slice(0, multichar_arr.length - 1).join(mi_split_str);
		let last_char_regex = mi_close + space + '(<msubsup>)' + space + '<mrow>' + space + mi_open_nattr + multichar_arr[multichar_arr.length - 1] + mi_close + space + '</mrow>';
		let mi_script_regex = new RegExp(main_char_regex + last_char_regex, "g");
		// set replacement values for multi-char
		let mi_replace = "<mi$1>" + curr_word.val + "</mi>";
		let mi_script_replace = "$2<mrow>" + mi_replace + "</mrow>";
		// multiplication
		if (curr_word.type === "m") {
			// add invisible multiplication between variables
			let var_mult = multichar_arr.join("</mi><mo>&it;</mo><mi>");
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, "<mi>" + var_mult + "</mi>");
		}
		// comma
		else if (curr_word.type === "c") {
			// add invisible comma between variables
			let var_comma = multichar_arr.join("</mi><mo>&ic;</mo><mi>");
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, "<mi>" + var_comma + "</mi>");
		}
		// variable
		else if (curr_word.type === "v" || curr_word.type === "a") {
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, mi_replace);
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_script_regex, mi_script_replace);
		}
		// function
		else if (curr_word.type === "f") {
			// add string for invisible function application
			let invis_func = "<mo>&af;</mo>";
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, mi_replace + invis_func);
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_script_regex, mi_script_replace + invis_func);
		}
	}
	// remove multiple instances of invisible function
	multichar_mathml_text = multichar_mathml_text.replaceAll(/(<mo>&af;<\/mo>)+/g, "<mo>&af;</mo>");
	return multichar_mathml_text;
}