import json
import sys
import os

def update_package_json(target_path):
    if not os.path.exists(target_path):
        print(f"Target {target_path} does not exist.")
        return

    try:
        with open(target_path, 'r') as f:
            data = json.load(f)

        if 'dependencies' not in data:
            data['dependencies'] = {}

        new_deps = {
            "axios": "^1.6.7",
            "nodemailer": "^6.9.9"
        }

        added = False
        for dep, version in new_deps.items():
            if dep not in data['dependencies']:
                data['dependencies'][dep] = version
                added = True

        if added:
            with open(target_path, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Successfully updated {target_path} with chatbot dependencies.")
        else:
            print(f"Chatbot dependencies already present in {target_path}.")

    except Exception as e:
        print(f"Error updating package.json: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_package_json.py <target_package_json_path>")
        sys.exit(1)
    update_package_json(sys.argv[1])
