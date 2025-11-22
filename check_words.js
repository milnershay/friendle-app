/* eslint-disable @typescript-eslint/no-require-imports */
const { WORD_LISTS } = require('./src/lib/wordLists.ts');
const hebrewRegex = /^[\u0590-\u05FF]+$/;
['he'].forEach(lang => {
    [4, 5, 6].forEach(len => {
        const badWords = WORD_LISTS[lang][len].filter(w => !hebrewRegex.test(w) || w.length !== len);
        if (badWords.length > 0) console.log(lang, len, badWords);
    });
});
