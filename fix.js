const fs = require('fs');
const glob = require('glob');

const files = [
  ...glob.sync('mobile/app/**/*.tsx', { absolute: true }),
  ...glob.sync('mobile/components/**/*.tsx', { absolute: true })
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('SafeAreaView') && !content.includes('react-native-safe-area-context')) {
    content = content.replace(/import\s+\{([^}]*?)SafeAreaView([^}]*?)\}\s+from\s+['"]react-native['"];?/, "import { $1$2} from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';");
    content = content.replace(/import\s+\{\s*,\s*\}\s+from\s+['"]react-native['"];?\n?/, '');
    content = content.replace(/import\s+\{\s*\}\s+from\s+['"]react-native['"];?\n?/, '');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed SafeAreaView in ' + f);
  }
});
