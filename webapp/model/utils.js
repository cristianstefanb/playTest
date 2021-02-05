sap.ui.define([
	"./indexedDB"
], function (IndexedDB) {

	return {

		generateXMLDocument: function (e) {
			var dfd = new $.Deferred();
			var oController = e.getOwnerComponent();
			var oModel = oController.getModel("serviceModel");
			var request = oModel.metadataLoaded(true);

			request.then(function (result) {
				// var xmlDoc = this._getXMLDoc(result[0]);
				// dfd.resolve(xmlDoc);
				 var oDataModel = this.getOwnerComponent().getModel("serviceModel");
                    // Fetching MetaModel from the OData model
                    var oMetaModel = oDataModel.getMetaModel();
				debugger
				
				
			}.bind(e));

			return dfd.promise();
		},

		_getXMLDoc: function (metadata) {
			var parser = new DOMParser();

			return parser.parseFromString(metadata.metadataString, "text/xml");
		},

		parseXmlDoc: function (xml) {
			var arr = [];
			arr.mapping = [];
			arr.map = [];

			this._getEntities(xml, arr);
			this._defMapping(xml, arr);
			this._tranformETinES(arr);

			return arr;
		},

		_getEntities: function (xml, arr) {
			var aElements = xml.getElementsByTagName("EntityType");
			var iNodes = aElements.length;

			for (var i = 0; i < iNodes; i++) {
				var nodeParent = aElements[i];
				var sEntName = nodeParent.getAttribute("Name");
				var childCount = nodeParent.childElementCount;
				
				arr[sEntName] = [];
				arr[sEntName].key = [];
				arr[sEntName].property = [];
				arr.map[i] = [];
				

				for (var j = 0; j < childCount; j++) {
					var child = nodeParent.children[j];
					if (child.nodeName === "Key") {
						for (var x = 0; x < child.childElementCount; x++) {
							arr[sEntName].key.push(child.children[x].getAttribute("Name"));
						}
					} else if (child.nodeName === "Property") {
						// if (arr[sEntName].key.includes(child.getAttribute("Name"))) { //if key 
						// } else {
							arr[sEntName].property.push(child.getAttribute("Name"));
							
							arr.map[i]["key"] = sEntName;
							arr.map[i][child.getAttribute("Name")] = child.getAttribute("Type");
							
							// key: child.getAttribute("Name"),
							// 		prop:[child.getAttribute("Type")]
							

					}
				}
				arr[sEntName].property.sort();
			}
		},

		_defMapping: function (xml, arr) {
			var aElements = xml.getElementsByTagName("EntitySet");
			var iNodes = aElements.length;

			for (var i = 0; i < iNodes; i++) {
				var elementSet = aElements[i];
				var obj = {
					entitySet: elementSet.getAttribute("Name"),
					entityType: elementSet.getAttribute("EntityType").slice(15)
				};
				arr.mapping.push(obj);
			}
		},
		
		_tranformETinES: function (arr) {
			arr.map.forEach(function(item){
				var identified = arr.mapping.find(function(el){
					return el.entityType === item.key;
				});	
				item.key = identified.entitySet;
			});
			
			// var result = arr.map.find(function(elem){
			// 	return arr.mapping.some(function(item){
			// 		return item.key === elem.entityType;
			// 	});
			// });
		},

		_readServerData: function (ctrl, sEntitySet) {
			return new Promise(function (resolve, reject) {
				var oModel = ctrl.getModel("serviceModel");
				oModel.read("/" + sEntitySet, {
					success: function (data, result) {
						resolve(data.results);
					}.bind(this)
				});
			}.bind(this));
		}
		

	};

});