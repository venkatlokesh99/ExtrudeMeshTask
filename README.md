# ExtrudeMeshTask
Project to create a Extrude Mesh using Babylon.js

To try out the project,
Clone the repository and run the following commands:
   1. npm install
   2. npm start
> After the installation is complete, open your browser and navigate to http://localhost:3000/ to load the site.

## 1. Extruding the Mesh

To perform an extrusion, click on one of the faces of the cube. This action will select the face for extrusion.
Once the face is selected, move your cursor. You will notice that the selected face moves in the direction of its normal vector.
To complete the extrusion, click again (release the click after the first click).
Note: The extrusion functionality simulates a push-pull mechanism similar to SketchUp. It allows you to interactively modify the shape of the cube by extruding individual faces.

## 2. Orbiting the Scene

Until the extrusion is confirmed or completed, you cannot orbit around the scene. This restriction ensures accurate interaction during the extrusion process.
## 3. Resetting the Mesh

A reset button is located in the top-right corner of the scene. Clicking the reset button will revert the dimensions of the cube, undoing any changes made to it.

## 4. Enabling Drag Behavior

To enable drag behavior for the mesh:
Uncomment the part in the code that says scene.onPointerUp() and the code within that function.
Remove the counter being set in the scene.onPointerDown() function.
