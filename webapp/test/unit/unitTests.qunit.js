/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"de/sdc/indexeddb_prototype/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});