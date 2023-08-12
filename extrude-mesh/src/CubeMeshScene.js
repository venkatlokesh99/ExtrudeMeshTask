import React, { useCallback, useEffect, useRef, useState } from "react";
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

const MOVE_SPEED = 5;
const BOX_COLOR = new BABYLON.Color4(1, 1, 1, 1);
const BOX_TRANSPARENT_COLOR = new BABYLON.Color4(1, 1, 1, 1);
const HOVER_COLOR = new BABYLON.Color4(12 / 255, 242 / 255, 93 / 255, 1);
const GHOST_COLOR = new BABYLON.Color4(30 / 255, 114 / 255, 95 / 255, 1);

// Get the indices of the faces that share the same vertex points
function getAdjacentIndices(indices, positions) {
  const adjacent = Array.from({ length: indices.length }, () => []);

  for (let i = 0; i < indices.length; i++) {
    for (let j = 0; j < indices.length; j++) {
      if (
        positions[3 * indices[i] + 0] === positions[3 * indices[j] + 0] &&
        positions[3 * indices[i] + 1] === positions[3 * indices[j] + 1] &&
        positions[3 * indices[i] + 2] === positions[3 * indices[j] + 2]
      ) {
        adjacent[indices[i]].push(indices[j]);
      }
    }
  }
  return adjacent;
}

const CubeMeshScene = () => {
  // Creating reference for scene
  const sceneRef = useRef(null);

  // Creating state variables to know if the user is Dragging or not
  const [dragging, setDragging] = useState(false);
  // State for saving the pointer hit info
  const [hitInfo, setHitInfo] = useState(null);

  // Refs for Dragging and hit information
  const draggingRef = useRef();
  const hitInfoRef = useRef();
  draggingRef.current = dragging;
  hitInfoRef.current = hitInfo;

  // Render Loop
  useEffect(() => {
    // Ref to canvas
    const canvas = sceneRef.current;

    // Create the Babylon.js engine
    const engine = new BABYLON.Engine(canvas, true);

    // Create a scene
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(129 / 255, 65 / 255, 89 / 255, 1);
    scene.useOrderIndependentTransparency = true;

    // Create a null reference to a variable called plane (later used to create the ghost face)
    let plane = null;
    // Create a box
    let box = BABYLON.MeshBuilder.CreateBox(
      "box",
      { size: 1, updatable: true },
      scene
    );

    box.hasVertexAlpha = true;
    box.convertToFlatShadedMesh();

    box.position = new BABYLON.Vector3(0, 0, 0);

    // Save the Positions and the default vertex colors
    let positions = box.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    let colors = box.getVerticesData(BABYLON.VertexBuffer.ColorKind);

    // if colors array is undefined recreate them with a white color
    if (!colors)
      colors = Array.from({ length: (positions.length / 3) * 4 }, () => 1);

    // Get the indices of the box and the adjacent indices from the functioned defined above
    const indices = box.getIndices();
    const adjacent = getAdjacentIndices(indices, positions);

    // Create a camera object, (basically what we see through) and set its initial position and target
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      0,
      0,
      10,
      box.position,
      scene
    );

    camera.setPosition(new BABYLON.Vector3(0, 0, 5));
    camera.attachControl(canvas, true);

    // Create an environment light and position it right above the mesh 
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 10, 0), scene);

    // Add an event listener to the window and resize the engine/canvas accordingly; Helps with the responsiveness of the site
    window.addEventListener("resize", function () {
      engine.resize();
    });
    // Run the render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // set the color for the ghost box
    const clearBoxColor = (color) => {
      colors = Array.from({ length: positions.length / 3 }, () =>
        color.asArray()
      ).flat();
      box.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
    };

    // set the color for the highlighted face
    const highlightFace = (face, color) => {
      const facet = 2 * Math.floor(face);

      for (var i = 0; i < 6; i++) {
        const vertex = indices[3 * facet + i];

        colors[4 * vertex] = color.r;
        colors[4 * vertex + 1] = color.g;
        colors[4 * vertex + 2] = color.b;
        colors[4 * vertex + 3] = color.a;
      }

      box.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
    };

    // so we initialize the counter at zero
    let counter = 0;

    // Handle pointer down (click) event
    scene.onPointerDown = () => {
      // pick mesh at the pointer position
      const hit = scene.pick(scene.pointerX, scene.pointerY);
      // check if its the first click and a mesh is picked
      if (counter === 0 && hit.pickedMesh) {
        counter++;
        if (hit.pickedMesh) {
          // set the dragging state to true
          setDragging(true);
          // extract face, facet, and normal information from hit
          const face = hit.faceId / 2;
          const facet = 2 * Math.floor(face);
          const normal = hit.getNormal();

          // store the values in a state
          setHitInfo({
            face,
            facet,
            normal,
            position: {
              x: scene.pointerX,
              y: scene.pointerY,
            },
          });
          // set the colors for the highlighted face and the ghosted box
          clearBoxColor(BOX_TRANSPARENT_COLOR);
          highlightFace(face, GHOST_COLOR);

          // create a temporary plane for visual feedback during extrusion and position it at the location of the selected face
          plane = BABYLON.MeshBuilder.CreatePlane("temp", {}, scene);
          plane.setIndices([0, 1, 2, 3, 4, 5]);
          plane.setVerticesData(
            BABYLON.VertexBuffer.PositionKind,
            indices
              .slice(3 * facet, 3 * facet + 6)
              .map((i) => [...positions.slice(3 * i, 3 * i + 3)])
              .flat()
          );
          plane.setVerticesData(
            BABYLON.VertexBuffer.ColorKind,
            Array.from({ length: 6 }).fill(HOVER_COLOR.asArray()).flat()
          );
          plane.updateFacetData();
          plane.convertToFlatShadedMesh();
        }
      } else if (counter === 1) {
        // dispose the temporary plane
        plane.dispose();
        // reset the counter
        counter = 0;
        // return the control to the camera
        camera.attachControl(canvas, true);
        // reset the drag state and the hit info state
        setDragging(false);
        setHitInfo(null);
      }
    };
    // define a function that converts screen coordinates to 3D coordinates
    const unproject = ({ x, y }) =>
      BABYLON.Vector3.Unproject(
        new BABYLON.Vector3(x, y, 0),
        engine.getRenderWidth(),
        engine.getRenderHeight(),
        BABYLON.Matrix.Identity(),
        scene.getViewMatrix(),
        scene.getProjectionMatrix()
      );
    // handle pointer move events
    scene.onPointerMove = () => {
      // check if the pointer is actually on the mesh 
      if (draggingRef.current && hitInfoRef.current) {
        // remove the camera control as we don't want our scene bugging out
        camera.detachControl();
        // extract facet, normal and positon information from hit
        const { facet, normal, position } = hitInfoRef.current;
        // calculate the offset from initial position
        const offset = unproject({
          x: scene.pointerX,
          y: scene.pointerY,
        }).subtract(unproject(position));
        // get the vertices affected by the extrusion
        const vertices = Array.from(
          new Set(
            indices.slice(3 * facet, 3 * facet + 6).reduce((acc, cur) => {
              acc.push(cur);
              acc.push(...adjacent[cur]);
              return acc;
            }, [])
          )
        );
        // iterate over the vertices affected by the extrusion
        vertices.forEach((vertex) => {
          // and update the vertices along their normal
          for (let j = 0; j < 3; j++) {
            positions[3 * vertex + j] +=
              MOVE_SPEED *
              BABYLON.Vector3.Dot(offset, normal) *
              normal.asArray()[j];
          }
        });
        // update the vertices of the box
        box.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
        // update the hit info with the current pointer position
        setHitInfo({
          ...hitInfoRef.current,
          position: {
            x: scene.pointerX,
            y: scene.pointerY,
          },
        });
      } else {
        clearBoxColor(BOX_COLOR);

        const hit = scene.pick(scene.pointerX, scene.pointerY);

        if (hit.pickedMesh) {
          // highlight the picked face
          const face = hit.faceId / 2;
          highlightFace(face, HOVER_COLOR);
        }
      }
    };
    
    // create a GUI with a button that says reset in it. The rest of it is just styling it
    const Ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    const Reset = GUI.Button.CreateSimpleButton("Reset", "Reset");
    Reset.widthInPixels = 200;
    Reset.heightInPixels = 80;
    Reset.cornerRadius = 10;
    Reset.horizontalAlignment = 2;
    Reset.verticalAlignment = 0;
    Reset.background = "#2E3388";
    Reset.color = "#ffffff";
    Reset.paddingRight = "15px";
    Reset.paddingTop = "15px";
    Reset.hoverCursor = "arrow";

    // when the button is clicked reset the cube
    Reset.onPointerClickObservable.add(function () {
      // dispose of the existing cube
      box.dispose();
      // create a new one and provide the same values as we did earlier
      box = new BABYLON.MeshBuilder.CreateBox(
        "box",
        { size: 1, updatable: true },
        scene
      );
      box.convertToFlatShadedMesh();
      box.position = new BABYLON.Vector3(0, 0, 0);
      positions = box.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      console.log("Positions Reset DONE");
    });
    // add the ui component to the screen
    Ui.addControl(Reset);

    // Clean up on component
    return () => {
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={sceneRef} style={{ width: "100vw", height: "100vh" }} />
    </>
  );
};

export default CubeMeshScene;