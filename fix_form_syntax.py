from pathlib import Path
import re

root = Path('src/forms')
files = sorted(root.glob('*.tsx'))

replacements = [
    (
        re.compile(r"const SectionTitle: FC<\{\{children: React\.ReactNode\}}> = \(\{\{children\}\}\) => \("),
        "const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (",
    ),
    (
        re.compile(r"const FormFooter: FC<\{\{onCancel: \(\) => void; label: string; onSubmit: \(\) => void\}>\} = \(\{\{onCancel, label, onSubmit\}\}\) => \("),
        "const FormFooter: FC<{ onCancel: () => void; label: string; onSubmit: () => void }> = ({ onCancel, label, onSubmit }) => (",
    ),
    (
        re.compile(r"style=\{\{\{\{fontFamily:'Syne,sans-serif'\}\}\}\}"),
        "style={{ fontFamily: 'Syne, sans-serif' }}",
    ),
]

for file in files:
    text = file.read_text(encoding='utf-8')
    original = text
    text = text.replace('{{children}}', '{children}')
    text = text.replace('onClick={{onCancel}}', 'onClick={onCancel}')
    text = text.replace('onClick={{onSubmit}}', 'onClick={onSubmit}')
    text = text.replace('>{{label}}</button>', '>{label}</button>')
    for pattern, repl in replacements:
        text = pattern.sub(repl, text)
    if text != original:
        file.write_text(text, encoding='utf-8')
        print(f'Updated {file}')
