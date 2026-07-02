const { exec } = require('child_process');
const fs = require('fs');

exec('npx tsc --noEmit', { cwd: 'c:\\Users\\basar\\IdeaProjects\\finance-project\\frontend' }, (error, stdout, stderr) => {
  fs.writeFileSync('c:\\Users\\basar\\IdeaProjects\\finance-project\\frontend\\tsc_output.txt', stdout + '\n' + stderr);
});
