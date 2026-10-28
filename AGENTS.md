# Agent Instruction file 
This file contains the instructions for AI agents to code the PrismFin web application

## Project description
You are building PrismFin, a custom selfhostedd Jellyfin web client. The design is based on Apple's Liquid Glass and has a complete custom design. It should be a drop-in replacement for the standard Jellyfin web client.

## Tech stack
Languages: HTML, SCSS (CSS), Typescript
Framework: ReactJS, Deno, Vite
Code Formatting: Prettier

You will use the Jellyfin API to connect to a Jellyfin Server. Jellyfin users can be connected via [Jellyfin-Plugin-SSO](https://raw.githubusercontent.com/9p4/jellyfin-plugin-sso).

The Jellyfin server can also have the [Home Screen Sections](https://github.com/IAmParadox27/jellyfin-plugin-home-sections) plugin installed. Use it to populate the home screen whenever available.

## Coding standards
You should use Prettier to format code styling and linting.
- Indentation should be 4 spaces.
- You should use ; at the end of code lines.
- You should use double quotes.
- you should follow the es5 standard for trailing commas
- you should use bracket spacing
- Bracket line should be false

- You should use lowerCamelCase for variables
- You should use readable variable names that are descriptive
- Do not use too many comments.
- Don't use words like: FIX, I did this etc. in comments. Only describe complex parts of the code.
- Code with mobile support. Resizing the application is a must and responsive design is important.
- component folders should use kebab-case.
- A component consists of a component-name.scss file and componentName.ts file.

### Architecture
You should work in a layered architecture:
- Layer 1, Infrastructure: This is where the communication with the outside happens. Wether it is a database or web api's you should call them here and transform the calls into objects/datastructures that you can use inside the Application layer
- Layer 2, Application: This is where the processing happens and every calculation / compute happens that is needed to complete a request. The application layer is responsible for gathering all relevant data / calling the Infrastructure layer and making it ready to be displayed in the presentation layer
- Layer 3, Presentation: This is where the actual UI lives and. OnClick functions / page transitions, animations, playback etc. The application layer controls what happens here. The presentation layer only relays what the user wants. 
- Side Layer, Common: This is where you can store common Classes and other things that multiple layers need. Be careful that this layer does not become too bloated. You should only store the neccessary things here. 

You should make a Progressive Web App that can also run on a mobile device such as a phone or tablet.

## Design description

The application uses Apple's Liquid glass design guidelines and visual style for it's UI.

There are already assets available for you to use. Don't use any other assets than are already in the project. If you need more, give me a list of your requirements. The public/assets folder contains icon SVG's, fonts and the branding logos / favicons that you can use in the project.
