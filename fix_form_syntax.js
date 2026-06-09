const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'src', 'forms');
const files = fs.readdirSync(root).filter(name => name.endsWith('.tsx'));
const replacements = [
    {
        pattern: /const SectionTitle: FC<\{\{children: React\.ReactNode\}}> = \(\{\{children\}\}\) => \(/gs,
        replacement: 'const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (',
    },
    {
        pattern: /const FormFooter: FC<\{\{onCancel: \(\) => void; label: string; onSubmit: \(\) => void\}>\} = \(\{\{onCancel, label, onSubmit\}\}\) => \(/gs,
        replacement: 'const FormFooter: FC<{ onCancel: () => void; label: string; onSubmit: () => void }> = ({ onCancel, label, onSubmit }) => (',
    },
    {
        pattern: /style=\{\{\{\{fontFamily:'Syne,sans-serif'\}\}\}\}/gs,
        replacement: "style={{ fontFamily: 'Syne, sans-serif' }}",
    },
];
let updatedCount = 0;
for (const fileName of files) {
    const filePath = path.join(root, fileName);
    let text = fs.readFileSync(filePath, 'utf8');
    const original = text;
    text = text.replace(/\{\{children\}\}/g, '{children}');
    text = text.replace(/onClick=\{\{onCancel\}\}/g, 'onClick={onCancel}');
    text = text.replace(/onClick=\{\{onSubmit\}\}/g, 'onClick={onSubmit}');
    text = text.replace(/>\{\{label\}\}<\/button>/g, '>{label}</button>');
    for (const { pattern, replacement } of replacements) {
        text = text.replace(pattern, replacement);
    }
    if (text !== original) {
        fs.writeFileSync(filePath, text, 'utf8');
        console.log(`Updated ${fileName}`);
        updatedCount += 1;
    }
}
console.log(`Updated ${updatedCount} file(s)`);
