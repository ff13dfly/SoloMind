module.exports = {
    "sample_entity": {
        description: "A sample entity for demonstration",
        fields: {
            "id": { type: "string", description: "Unique identifier", required: true },
            "name": { type: "string", description: "Entity name", required: true },
            "status": { type: "enum", options: ["active", "archived"], description: "Entity status" },
            "createdAt": { type: "datetime", description: "Creation timestamp" }
        }
    }
};
