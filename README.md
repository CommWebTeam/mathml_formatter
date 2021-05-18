# MathML formatter
Takes in a line-separated list of side-by-side variables in the MathML document and groups instances of them together appropriately. By default, when copying variables from word, word does not recognize when a group of characters represents a single variable; each character is placed in its own separate &lt;mi>, &lt;mo>, or &lt;mn> tag and treated as a separate variable. This tool tries to join them together where appropriate using a user-supplied variable list.

[HTML page of tool here.](https://commwebteam.github.io/mathml_formatter/mathml.html)

It also does some basic formatting of the MathML code pasted from word, including:
- removing "mml:" in the tags
- removing extra attributes in the &lt;math> tags
- replacing any variables consisting solely of a space with mspace

If the option is checked, it also removes the *mathvariant="normal"* attribute (this formatting usually happens when you copy text from elsewhere in the Word document into an equation).

This tool assumes consistent space encoding (dealt with in the [general Dreamweaver paste formatting tool](https://commwebteam.github.io/gen_dw_format/dreamweaver_paste_formatter/format_dw_paste.html)).

## How to format the variable list
The list of side-by-side variables should be line-separated. Each line should consist of the variable name(s), followed by a space and then a single character of v, f, m, c, or a.

The single character indicates how the variable(s) should be treated:
- v (variable) indicates that the string consists of a single multi-character variable.
- f (function) indicates that the string consists of a single multi-character function.
- m (multiplication) indicates that the string consists of individual single-character variables multiplied together.
- c (comma) indicates that the string consists of individual single-character variables listed side-by-side.
- a (acronym) indicates that the string consists of a single multi-character acronym. These are currently treated identically to regular multi-character variables (v).

For v, f, and a, consecutive &lt;mi> tags that each contain a character in the string are joined together. The tool also checks for a specific edge case where the final character in the string is part of a superscript of subscript tag.

For f, `&af;` is also added after the function.

For m and c, `&it;` and `&ic;` are respectively added between each character.

### Example list

Suppose we have math indicating the following equation:

max(alpha) = ab - c<sub>ij</sub>

Which states that [the maximum of alpha] is equal to [(a multiplied by b) minus (c subscript ij)], where i indicates row and j indicates column.

We can see that
- max is a function.
- alpha is a variable.
- ab consists of two variables being multiplied against each other.
- ij consists of two variables listed side-by-side.

So the list would consist of
```
max f
alpha v
ab m
ij c
```

and the MathML would look like so:

```
<math>
  <mrow>
    <mrow>
      <mi>max</mi>
      <mo>&af;</mo>
    </mrow>
    <mo>⁡</mo>
    <mrow>
      <mfenced separators="|">
        <mrow>
          <mi>alpha</mi>
        </mrow>
      </mfenced>
    </mrow>
  </mrow>
  <mo>=</mo>
  <mi>a</mi>
  <mo>&it;</mo>
  <mi>b</mi>
  <mo>-</mo>
  <msub>
    <mrow>
      <mi>c</mi>
    </mrow>
    <mrow>
      <mi>i</mi>
      <mo>&ic;</mo>
      <mi>j</mi>
    </mrow>
  </msub>
</math>
```

### Variable list priority

Variables/functions/acronyms are checked after multiplication/commas. This way, multi-character variables/functions/acronyms can find and join their individual characters if any subwords have previously been multiplied or comma-listed.

Within these two groups, strings are sorted by length in descending order. This is so that smaller subwords being joined do not prevent a search for longer parent words later on. For example, if "sub v" was joined before "subword v", then the string of &lt;mi tags consisting of s, then u, then b would be joined into one &lt;mi tag of "sub". The tool would not be able to find a string of &lt;mi tags consisting of s, then u, then b, then w, then o, then r, then d. Note that you may still run into issues with subwords being joined first if you have run the tool multiple times with different variable lists.

#### Example
Given the following list:

*ab f*

*cde v*

*cdef m*

This will be sorted into

*cdef m*

*cde v*

*ab f*

The tool will perform the following steps in the given order:
1. `&it;` will be inserted between all `<mi>` tags that consecutive contain c, then d, then e, then f.
2. All consecutive mi tags containing c, then d, then e (including those that have `&it;` between) are joined into `<mi>cde</mi>`. 
3. All consecutive mi tags containing a then b are joined into `<mi>ab</mi>` and are followed by `&af;`.

## Formatting summations
If the option for "Attempt to format summations that have top/bottom values?" is checked, the tool will also attempt to adjust summations that have top/bottom values so that their text is above/below the summation symbol rather than to the right. It also adds padding around `<munder>` and `<munderover>`.

The current padding added around rows is
- height="+2ex" voffset="1ex" for the summation itself;
- lspace="-0.7em" voffset="-1ex" for the bottom value of a summation;
- lspace="-0.7em" voffset="1ex" for the top value of a summation.

You can adjust these values in the format_summations() function in mathml_helpers.js.

The tool searches for summations using the keyword `<mo stretchy="false">`, then looks for the next mrow tags that have the same indentation as the keyword to add the padding around. Since it matches opening and closing tags based on them having the same indentation, it requires proper HTML indentation (you can apply this in Dreamweaver through Edit -> Code -> Apply Source Formatting).

For example, this MathML code for a summation has a bottom value:

```
<math>
  <mrow>
    <munder>
      <mo stretchy="false">∑</mo>
      <mrow>
        <mi>b</mi>
      </mrow>
    </munder>
    <mrow>
      <mi>x</mi>
      <mi>y</mi>
      <mi>z</mi>
    </mrow>
  </mrow>
</math>
```

It is changed to the following:

```
<math>
  <mrow>
    <mpadded height="+2ex" voffset="1ex">
      <munder>
        <mo stretchy="false">∑</mo>
        <mrow>
          <mpadded lspace="-0.7em" voffset="-1ex">
            <mi>b</mi>
          </mpadded>
        </mrow>
      </munder>
    </mpadded>
    <mrow>
      <mi>x</mi>
      <mi>y</mi>
      <mi>z</mi>
    </mrow>
  </mrow>
</math>
```

This MathML code for a summation has both a top and a bottom value:

```
<math>
  <mrow>
    <munderover>
      <mo stretchy="false">∑</mo>
      <mrow>
        <mi>b</mi>
      </mrow>
      <mrow>
        <mi>c</mi>
      </mrow>
    </munderover>
    <mrow>
      <mi>a</mi>
    </mrow>
  </mrow>
  <mi>b</mi>
  <mi>c</mi>
</math>
```

It is changed to the following:

```
<math>
  <mrow>
    <mpadded height="+2ex" voffset="1ex">
      <munderover>
        <mo stretchy="false">∑</mo>
        <mrow>
          <mpadded lspace="-0.7em" voffset="-1ex">
            <mi>b</mi>
          </mpadded>
        </mrow>
        <mrow>
          <mpadded lspace="-0.7em" voffset="1ex">
            <mi>c</mi>
          </mpadded>
        </mrow>
      </munderover>
    </mpadded>
    <mrow>
      <mi>a</mi>
    </mrow>
  </mrow>
  <mi>b</mi>
  <mi>c</mi>
</math>
```

# Working with MathML when converting Word documents

## Copying equations in Word as MathML instead of linear formatting

You can copy equations from Word as MathML code instead of the default linear formatting option through the following steps:

1. Click on any equation in the Word document. (You can create your own equation through the "Insert" tab of the ribbon, on its right side.)
2. In the "Design" tab of the ribbon, go to Equation Options (the arrow at the bottom right of the "Tools" section):
![Equation options](equation_options.png)
3. Select "Copy MathML to the clipboard as plain text".

## Getting math in a Word document

Since copying an entire Word document will copy the equations in linear format instead of MathML, even if the above option is selected, the VBA macro in our [macro repository](https://github.com/CommWebTeam/vba) copies the math out of the equations as MathML, and then pastes them back into the document at the same location. You can then copy the entire Word document into Dreamweaver with the MathML intact.

After doing so, since the MathML tags are read as text, the brackets will be pasted as their html entities (e.g. &lt;math> will be pasted as &amp;lt;math&amp;gt;). You can fix this using one of the checks in the [general Dreamweaver paste formatting tool](https://commwebteam.github.io/gen_dw_format/dreamweaver_paste_formatter/format_dw_paste.html).

## Visually inspecting MathML equations for correctness

Since math equations in an HTML document aren't easily Beyond Compared, you will have to go through them one by one to visually inspect them for correctness compared to their Word counterparts.

Don't forget that you can search for equations in a Word document using the Cambria Math font (in Word's advanced find, click "More >>" -> "Format" -> "Font" and select Cambria Math).

I also wrote a quick tool to extract any lines that have math chunks from an HTML document, along with their line numbers and surrounding lines for context. I figured this would be helpful to more easily scan through math equations and check for errors.

[HTML document here.](get_math/get_math.html)
