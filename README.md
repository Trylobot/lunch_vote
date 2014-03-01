lunch vote!
==========
http://lunchvote.org

* node.js
* socket.io
* knockout.js
* jQuery
* SCSS

To perform first-time setup, copy *app.cfg.EXAMPLE.json* to *app.cfg.json* and make any desired changes. Make sure *Node.js* is installed somewhere and run *install_server.bat*. If you plan to debug the server, also run *install_node-inspector.bat*. If you plan to make changes to styles, make sure *Sass* is installed first.

To start the server for development/testing, run *start_server.bat*. 

To debug server side, run *debug_server.bat*, run *start_node-inspector.bat*, then run shortcut *view_node-inspector*

To make changes to the client-side javascript, edit _src/*.js_, then minify and save in _public/*.min.js_

To make changes to the stylesheets, run *watch_sass_style.bat*, edit _src/*.css_, then minify resulting _public/*.css_ and save in _public/*.min.css_

To make changes to assets, edit directly in _public/*_ (save psd sources in _docs_)

Data is stored in _data/*_

