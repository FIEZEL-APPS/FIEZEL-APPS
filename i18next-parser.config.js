module.exports = {
  locales: ['en', 'id', 'th', 'vi', 'ms', 'fil', 'ja', 'km', 'ru'],
  defaultNamespace: 'ui',
  output: 'features/i18n/locales/$LOCALE/$NAMESPACE.json',
  input: [
    'app.js',
    'features/**/*.{js,html}',
    '!features/i18n/locales/**',
    '!features/i18n/*.json',
    '!node_modules/**',
    '!tests/**'
  ],
  sort: true,
  createOldCatalogs: false,
  keySeparator: '.',
  namespaceSeparator: ':',
  defaultValue: function(locale, namespace, key, value) {
    return locale === 'id' ? (value || key) : '';
  },
  lexers: {
    js: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t', 'FiezelI18n.t']
      }
    ],
    html: [
      {
        lexer: 'HTMLLexer',
        functions: ['t', 'FiezelI18n.t']
      }
    ]
  }
};
