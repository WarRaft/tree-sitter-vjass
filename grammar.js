const PREC = {
    COMMA: -1,
    FUNCTION: 1,
    DEFAULT: 1,
    PRIORITY: 2,

    OR: 3, // => or
    AND: 4, // => and
    COMPARE: 5, // => < <= == ~= >= >
    BIT_OR: 6, // => |
    BIT_NOT: 7, // => ~
    BIT_AND: 8, // => &
    SHIFT: 9, // => << >>
    CONCAT: 10, // => ..
    PLUS: 11, // => + -
    MULTI: 12, // => * /             // %
    UNARY: 13, // => not # - ~
    POWER: 14, // => ^

    STATEMENT: 15,
    PROGRAM: 16,
}

module.exports = grammar({
    name: 'vjass',

    externals: $ => [
        $._block_comment_start,
        $._block_comment_content,
        $._block_comment_end,

        $._string_start,
        $._string_content,
        $._string_end,
    ],

    extras: $ => [/\n/, /\s/, $.comment],

    inline: $ => [
        //$._expression,
        $._field_expression,
        $.field_separator,
        $.prefix_exp,

        $.function_impl,
        $.comment,
    ],

    conflicts: $ => [
        [$._var, $._prefix_exp],
    ],

    rules: {
        program: $ =>
            prec(
                PREC.PROGRAM,
                seq(
                    repeat(seq(choice(
                        $._statement,
                    ))),
                    optional('\0')
                )
            ),

        var_stmt: $ =>
            prec.right(
                PREC.DEFAULT,
                seq(
                    optional(
                        repeat(
                            choice(
                                alias('local', $.local),
                                alias('constant', $.constant),
                                alias('array', $.array),
                            )
                        )
                    ),
                    field('type', $.id),
                    prec.right(
                        repeat(
                            choice(
                                ',',
                                alias(seq(
                                    field('name', $.id),
                                    optional(seq('=', $._expression)
                                    )
                                ), $.var_declz)
                            ),
                        )
                    )
                )
            ),


        string: $ =>
            seq(
                field('start', alias($._string_start, 'string_start')),
                field('content', optional(alias($._string_content, 'string_content'))),
                field('end', alias($._string_end, 'string_end'))
            ),

        _statement: $ =>
            prec.right(
                PREC.STATEMENT,
                seq(
                    choice(
                        $.var_stmt,
                        $.globals_stmt,

                        $.function_call,
                        $.do_statement,
                        $.while_statement,
                        $.repeat_statement,
                        $.if_statement,
                        $.function_statement
                        // $.comment
                    ),
                )
            ),

        _block: $ => choice(
            seq($._statement)
        ),

        _expression: $ =>
            prec.left(
                choice(
                    $.number,
                    $.string,
                    $.function,
                    $.prefix_exp,
                    $.tableconstructor,
                    $.binary_operation,
                    $.unary_operation
                )
            ),

        // Primitives {{{
        number: () => {
            const decimal_digits = /[0-9]+/
            const signed_integer = seq(optional(choice('-', '+')), decimal_digits)
            const decimal_exponent_part = seq(choice('e', 'E'), signed_integer)

            const decimal_integer_literal = choice(
                '0',
                seq(optional('0'), /[1-9]/, optional(decimal_digits))
            )

            const hex_digits = /[a-fA-F0-9]+/
            const hex_exponent_part = seq(choice('p', 'P'), signed_integer)

            const decimal_literal = choice(
                seq(
                    decimal_integer_literal,
                    '.',
                    optional(decimal_digits),
                    optional(decimal_exponent_part)
                ),
                seq('.', decimal_digits, optional(decimal_exponent_part)),
                seq(decimal_integer_literal, optional(decimal_exponent_part))
            )

            const hex_literal = seq(
                choice('0x', '0X'),
                hex_digits,
                optional(seq('.', hex_digits)),
                optional(hex_exponent_part)
            )

            return token(choice(decimal_literal, hex_literal))
        },

        function_name: $ =>
            seq(
                seq($.id, repeat(seq(alias('.', $.table_dot), $.id))),
                optional(seq(alias(':', $.table_colon), $.id))
            ),

        function: $ => seq($.function_start, $.function_impl),

        function_impl: $ =>
            seq(
                alias('(', $.function_body_paren),
                optional($.parameter_list),
                alias(')', $.function_body_paren),
                alias(optional($._block), $.function_body),
                alias('end', $.function_end)
            ),

        parameter_list: $ =>
            choice(
                seq(
                    prec.left(PREC.COMMA, seq($.id, repeat(seq(/,\s*/, $.id)))),
                ),
            ),
        // }}}

        _expression_list: $ => seq($._expression, repeat(seq(',', $._expression))),

        binary_operation: $ =>
            choice(
                ...[
                    ['or', PREC.OR],
                    ['and', PREC.AND],
                    ['<', PREC.COMPARE],
                    ['<=', PREC.COMPARE],
                    ['==', PREC.COMPARE],
                    ['~=', PREC.COMPARE],
                    ['>=', PREC.COMPARE],
                    ['>', PREC.COMPARE],
                    ['|', PREC.BIT_OR],
                    ['~', PREC.BIT_NOT],
                    ['&', PREC.BIT_AND],
                    ['<<', PREC.SHIFT],
                    ['>>', PREC.SHIFT],
                    ['+', PREC.PLUS],
                    ['-', PREC.PLUS],
                    ['*', PREC.MULTI],
                    ['/', PREC.MULTI],
                    ['//', PREC.MULTI],
                    ['%', PREC.MULTI],
                ].map(([operator, precedence]) =>
                    prec.left(precedence, seq($._expression, operator, $._expression))
                ),
                ...[
                    ['..', PREC.CONCAT],
                    ['^', PREC.POWER],
                ].map(([operator, precedence]) =>
                    prec.right(precedence, seq($._expression, operator, $._expression))
                )
            ),

        unary_operation: $ =>
            prec.left(PREC.UNARY, seq(choice('not', '#', '-', '~'), $._expression)),

        _var: $ =>
            prec(
                PREC.PRIORITY,
                choice(
                    $.id,
                    seq($.prefix_exp, '[', $._expression, ']'),
                    seq($.prefix_exp, '.', $.id)
                )
            ),

        var_list: $ => seq($._var, repeat(seq(',', $._var))),

        _id_list: $ =>
            prec.right(PREC.COMMA, seq($.id, repeat(seq(/,\s*/, $.id)))),

        return_statement: $ =>
            prec(PREC.PRIORITY, seq('return', optional(seq($._expression, repeat(seq(',', $._expression)))))),

        break_statement: _ => 'break',

        // Blocks {{{
        do_statement: $ =>
            seq(alias('do', $.do_start), optional($._block), alias('end', $.do_end)),

        while_statement: $ =>
            seq(
                alias('while', $.while_start),
                $._expression,
                alias('do', $.while_do),
                optional($._block),
                alias('end', $.while_end)
            ),

        repeat_statement: $ =>
            seq(
                alias('repeat', $.repeat_start),
                optional($._block),
                alias('until', $.repeat_until),
                $._expression
            ),

        if_statement: $ =>
            seq(
                alias('if', $.if_start),
                $._expression,
                alias('then', $.if_then),
                optional($._block),
                repeat(
                    seq(
                        alias('elseif', $.if_elseif),
                        $._expression,
                        alias('then', $.if_then),
                        optional($._block)
                    )
                ),
                optional(seq(alias('else', $.if_else), optional($._block))),
                alias('end', $.if_end)
            ),

        globals_stmt: $ => seq(
            alias('globals', $.globals),
            optional($._block),
            alias('endglobals', $.endglobals)
        ),

        function_start: () => 'function',

        function_statement: $ =>
            prec.right(
                PREC.DEFAULT,
                seq(
                    choice(
                        seq(
                            alias('local', $.local),
                            $.function_start,
                            field('name', $.id)
                        ),
                        seq($.function_start, /\s*/, field('name', $.function_name))
                    ),
                    $.function_impl
                )
            ),

        // }}}

        // Table {{{
        tableconstructor: $ => seq('{', optional($.fieldlist), '}'),

        fieldlist: $ =>
            prec(
                PREC.COMMA,
                seq($.field, repeat(seq($.field_separator, $.field)), optional($.field_separator)),
            ),

        field: $ => $._field_expression,

        _named_field_expression: $ =>
            prec(
                PREC.PRIORITY,
                seq(field('name', $.id), '=', field('value', $._expression))
            ),

        _expression_field_expression: $ =>
            prec(
                PREC.PRIORITY,
                seq(
                    // Decide if we really want to keep these...
                    //          It will be useful when we want to highlight them
                    //          in a particular color for people :)
                    field(
                        'field_left_bracket',
                        alias('[', $.field_left_bracket)
                    ),
                    field('key', $._expression),
                    field(
                        'field_right_bracket',
                        alias(']', $.field_right_bracket)
                    ),
                    '=',
                    field('value', $._expression)
                )
            ),

        _field_expression: $ =>
            choice(
                $._expression_field_expression,
                $._named_field_expression,
                field('value', $._expression)
            ),

        field_separator: _ => choice(',', ';'),
        // }}}

        // Function {{{
        _prefix_exp: $ =>
            choice(
                $._var,
                $.function_call,
                seq('(', $._expression, ')')
            ),

        prefix_exp: $ => $._prefix_exp,

        function_call: $ =>
            prec.right(
                PREC.FUNCTION,
                seq(field('prefix', $.prefix_exp), choice($._args, $._self_call))
            ),

        _args: $ => choice($._parentheses_call, $._table_call, $._string_call),

        _parentheses_call: $ =>
            seq(
                alias('(', $.function_call_paren),
                field('args', optional($.function_arguments)),
                alias(')', $.function_call_paren)
            ),

        _string_call: $ =>
            field(
                'args',
                //  Decide if this is really the name we want to use.
                alias($.string, $.string_argument)
            ),

        _table_call: $ =>
            field('args', alias($.tableconstructor, $.table_argument)),

        _self_call: $ =>
            seq(alias(':', $.self_call_colon), $.id, $._args),

        function_arguments: $ =>
            seq($._expression, optional(repeat(seq(',', $._expression)))),

        // }}}

        id: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

        // Comments {{{
        // comment: ($) => choice(seq("--", /[^-].*\r?\n/), $._multi_comment),
        comment: $ =>
            choice(
                seq(
                    field('start', alias('//', 'comment_start')),
                    field('content', alias(/[^\r\n]*/, 'comment_content'))
                ),
                seq(
                    field('start', alias($._block_comment_start, 'comment_start')),
                    field(
                        'content',
                        optional(alias($._block_comment_content, 'comment_content'))
                    ),
                    field('end', alias($._block_comment_end, 'comment_end'))
                )
            ),
        // }}}
    },
})