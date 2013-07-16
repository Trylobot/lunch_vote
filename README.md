lunch vote!
==========

http://lunchvote.net

* node.js
* socket.io
* knockout.js
* jQuery
* SCSS

To perform first-time setup, make sure Node.js is installed somewhere and run install_server.bat. If you plan to debug the server, also run install_node-inspector.bat
To start the server for development/testing, run start_server.bat. 
To debug server side, run debug_server.bat, run start_node-inspector.bat, then run shortcut "view_node-inspector"
To make changes to the client-side javascript, edit src/*.js, then minify and save in public/*.min.js
To make changes to the stylesheets, run watch_sass_style.bat, edit src/*.css, then minify resulting public/*.css and save in public/*.min.css
To make changes to assets, edit directly in public/* (save psd sources in docs)
Data is stored in data/*

