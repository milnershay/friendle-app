/* eslint-disable */
const fs = require('fs');

// Helper to check words against a list
function checkWords() {
    try {
        // Read the output file
        const content = fs.readFileSync('word_lists_output.txt', 'utf8');

        // Parse the content to find word lists
        // This is a basic check, you might need to adjust based on actual file format
        const lines = content.split('\n');
        let currentLang = '';
        let currentLength = 0;
        let errorCount = 0;

        lines.forEach(line => {
            if (line.includes('Language:')) {
                currentLang = line.split(':')[1].trim();
            } else if (line.includes('Length:')) {
                currentLength = parseInt(line.split(':')[1].trim());
            } else if (line.trim() && !line.startsWith('---')) {
                // Check if word length matches
                const word = line.trim();
                if (word.length !== currentLength) {
                    console.error(`Error: Word "${word}" in ${currentLang} list has length ${word.length}, expected ${currentLength}`);
                    errorCount++;
                }
            }
        });

        if (errorCount === 0) {
            console.log('All words pass length check!');
        } else {
            console.error(`Found ${errorCount} errors.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('Error reading file:', err);
        process.exit(1);
    }
}

checkWords();
