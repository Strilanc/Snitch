# Snitch

[![Build Status](https://travis-ci.org/Strilanc/Snitch.svg?branch=master)](https://travis-ci.org/Strilanc/Snitch)

Snitch is a surface code simulator.

# Building

If you want to modify Snitch, this is how you get the code and turn your changes into working html/javascript.

1. Have [git](https://git-scm.com/) and [Node.js](https://nodejs.org/en/download/) installed.

    `sudo add-apt-repository universe`
    
    `sudo apt-get update`
    
    `sudo apt-get install --yes git npm nodejs-legacy`

2. Clone the repository.

    `git clone https://github.com/Strilanc/Snitch.git`

3. Install the dev dependencies.

    `cd Snitch`
    
    `npm install`

4. (*Optional*) Make your changes. Run the tests.

    `npm run test-firefox`

5. Build the output.

    `npm run build`

6. Confirm the output works by opening `out/snitch.html` with a web browser.

    `firefox out/snitch.html`

7. Copy `out/snitch.html` to wherever you want.
