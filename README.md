# My Express Pug App

This is a simple single-page website built using Express and Pug. The application serves a dynamic web page with a clean and modern design.

## Project Structure

```
TwinRinksSA
├── src
│   ├── app.js          # Entry point of the application
|   |__ tools.js        # Misc tools like encrypt and log
|   |
│   └── routes
│       └── index.js    # Main route for the application
├── views
│   └── index.pug       # Pug template for the web page
├── public
│   ├── css
│   │   └── style.css    # Styles for the web page
│   └── js
│       └── jquery.sumoselect.min.js      # JavaScript for dropdown menu
├── package.json         # NPM configuration file
└── README.md            # Project documentation
```

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd TwinRinksSA
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Run the application:**
   ```
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` to view the application.

## Dependencies

This project uses the following dependencies:

- **express**: A minimal and flexible Node.js web application framework.
- **pug**: A template engine for Node.js.

## License

This project is licensed under the MIT License.