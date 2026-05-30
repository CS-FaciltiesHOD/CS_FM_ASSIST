import sys
from bs4 import BeautifulSoup
import re

def update_index(target_path, source_path):
    with open(target_path, 'r') as f:
        target_soup = BeautifulSoup(f, 'html.parser')

    with open(source_path, 'r') as f:
        source_soup = BeautifulSoup(f, 'html.parser')

    # 1. Update Styles
    # Find the specific style blocks in source
    source_fm_style = source_soup.find('style', id='fm-styles')

    # Remove existing FM styles and Launcher styles from target
    # We look for the ID 'fm-styles' or the old string pattern
    for style in target_soup.find_all('style'):
        if style.get('id') == 'fm-styles' or (style.string and 'FM Launcher design' in style.string):
            style.decompose()

    # Add new FM styles to head
    if source_fm_style:
        target_soup.head.append(source_fm_style)

    # 2. Update Launcher and Container
    # Remove existing launcher, container and toggle script from target
    launcher = target_soup.find('button', class_='fm-launcher')
    if launcher: launcher.decompose()

    container = target_soup.find('div', id='fm-container')
    if container: container.decompose()

    # The target might have a different container ID/class in the old version
    old_container = target_soup.find('div', class_='fm-widget-container')
    if old_container: old_container.decompose()

    # REMOVE OLD CHAT WIDGET (id="chat-widget")
    old_widget = target_soup.find('div', id='chat-widget')
    if old_widget: old_widget.decompose()

    # Find and remove scripts that contain toggleFM or the old chatbot logic (BACKEND_URL)
    for script in target_soup.find_all('script'):
        if script.string:
            if 'toggleFM' in script.string or 'BACKEND_URL' in script.string or 'chat-widget' in script.string:
                script.decompose()

    # Get new elements from source
    new_launcher = source_soup.find('button', class_='fm-launcher')
    new_container = source_soup.find('div', id='fm-container')
    new_script = source_soup.find('script', string=re.compile(r'toggleFM'))

    # Append to body
    if new_launcher: target_soup.body.append(new_launcher)
    if new_container: target_soup.body.append(new_container)
    if new_script: target_soup.body.append(new_script)

    # Write back to target
    with open(target_path, 'w') as f:
        # Use formatter=None to prevent BeautifulSoup from converting entities like &copy;
        f.write(target_soup.prettify(formatter=None))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python update_index.py <target_index_path> <source_index_path>")
        sys.exit(1)
    update_index(sys.argv[1], sys.argv[2])
