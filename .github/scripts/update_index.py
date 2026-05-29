import sys
import re

def update_index(target_path, source_path):
    with open(target_path, 'r') as f:
        target_content = f.read()

    with open(source_path, 'r') as f:
        source_content = f.read()

    # Extract the launcher and widget parts from the source index.html
    # Look for the FM Assist Launcher and Container comments
    launcher_match = re.search(r'<!-- FM Assist Launcher -->.*?<!-- FM Assist Container -->.*?<script>.*?</script>', source_content, re.DOTALL)

    if not launcher_match:
        # Fallback: extract by the specific classes and IDs
        launcher_part = re.search(r'<button class="fm-launcher".*?</script>', source_content, re.DOTALL)
        if launcher_part:
            launcher_code = launcher_part.group(0)
        else:
            print("Could not find launcher code in source index.html")
            return
    else:
        launcher_code = launcher_match.group(0)

    # Extract the style block for the launcher
    style_match = re.search(r'/\* --- FM Launcher design ---\s\*/.*?(?=</style>)', source_content, re.DOTALL)

    # Also extract :root variables for colors
    root_match = re.search(r':root\s*\{.*?\}', source_content, re.DOTALL)

    launcher_styles = "<style>\n"
    if root_match:
        launcher_styles += root_match.group(0) + "\n"
    if style_match:
        launcher_styles += style_match.group(0) + "\n"
    launcher_styles += "</style>"

    if not style_match and not root_match:
        launcher_styles = ""

    # Remove the old widget from the target index.html
    # The target has <!-- FM Assist Chat Widget --> and a large <script> block
    new_target_content = re.sub(r'<!-- FM Assist Chat Widget -->.*?<script>.*?</script>', '', target_content, flags=re.DOTALL)

    # Insert styles before </head>
    if launcher_styles:
        new_target_content = new_target_content.replace('</head>', f'{launcher_styles}\n</head>')

    # Insert launcher before </body>
    new_target_content = new_target_content.replace('</body>', f'{launcher_code}\n</body>')

    with open(target_path, 'w') as f:
        f.write(new_target_content)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python update_index.py <target_index_path> <source_index_path>")
        sys.exit(1)
    update_index(sys.argv[1], sys.argv[2])
