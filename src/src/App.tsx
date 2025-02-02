import { useState, useEffect } from "react";
import Draggable from "react-draggable";
import { Box } from "@mantine/core";
import "./App.css";
import StageButton from "./components/StageButton";
// import TaModule from "./components/TaModule";
import Menu from "./components/Menu";

interface ButtonObject {
  extra: number;
  numKey: number;
  enabled: boolean;
  color: string;
  label: string;
}

function App() {
  const [test, setTest] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [menuOpacity, setMenuOpacity] = useState(0);
  const [scale, setScale] = useState(1.0);
  // const [taClassString, setTaClassString] = useState("ta ta-off");
  const [useLeftAnchor, setUseLeftAnchor] = useState("false");
  const [hudDisabled, setHudDisabled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [x, setX] = useState(0.0);
  const [y, setY] = useState(0.0);
  const [buttonObjects, setButtonObjects] = useState<ButtonObject[]>([]);

  // SENDING DATA TO LUA

  useEffect(() => {
    let response = fetch(`https://ulc/saveScale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scale }),
    });
  }, [scale]);

  useEffect(() => {
    //console.log(`saveAnchor useEffect sending anchor value ${useLeftAnchor} to lua`)
    let response = fetch(`https://ulc/saveAnchor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ useLeftAnchor }),
    });
  }, [useLeftAnchor]);

  useEffect(() => {
    let response = fetch(`https://ulc/setHudDisabled`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hudDisabled }),
    });
  }, [hudDisabled]);

  ///////////////
  // FUNCTIONS //
  ///////////////

  function addButton(
    extra: number,
    numKey: number,
    enabled: boolean,
    color: string,
    label: string
  ) {
    setButtonObjects([
      ...buttonObjects,
      {
        extra: extra,
        numKey: numKey,
        enabled: enabled,
        color: color,
        label: label,
      },
    ]);
  }

  function setButton(extra: number, newState: boolean) {
    // console.log(`Setting buttons! Original buttons: ${buttonObjects}`);
    console.log(`Setting button ${extra} to ${newState}`);
    let updatedButtons = buttonObjects.map((item) =>
      item.extra === extra
        ? {
            ...item,
            enabled: newState,
          }
        : item
    );
    console.log(`Updated buttons ${JSON.stringify(updatedButtons)}`);
    setButtonObjects(updatedButtons);
  }

  // new method for setting buttons, old method has issues when updating multiple buttons at once
  // the goal is to only call this function once per stage change
  function setButtons(newButtons: { extra: number; newState: boolean }[]) {
    // console.log(`Setting buttons!`);
    let updatedButtons = buttonObjects.map((item) => {
      let found = newButtons.find(
        (newButton) => newButton.extra === item.extra
      );
      if (found) {
        return {
          ...item,
          enabled: found.newState,
        };
      } else {
        return item;
      }
    });
    setButtonObjects(updatedButtons);
  }

  // for ta stuff i guess
  // function strContains(string1: string, string2: string) {
  //   if (string1.indexOf(string2) >= 0) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  // function calculateTaClassString(buttons: any) {
  //   let result = "ta ta-off";
  //   for (let i = 0; i < buttons.length; i++) {
  //     const element = buttons[i];
  //     if (element.label.toUpperCase() === "TA") {
  //       result = "ta ta-on";
  //     }
  //   }
  //   return result;
  // }

  // DRAGGING UI

  const handleDragEvent = async (e: any, data: any) => {
    console.log(~~data.x, ~~data.y);
    let newX = ~~data.x;
    let newY = ~~data.y;

    setPosition(newX, newY);
    //send this position back to lua to save it for later
  };

  function setPosition(newX: number, newY: number) {
    setX(newX);
    setY(newY);
    let response = fetch(`https://ulc/savePosition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newX, newY }),
    });
  }

  ////////////////////
  // EVENT LISTENER //
  ////////////////////

  const handleMessage = (e: any) => {
    var data = e.data;

    if (data.type === "showHUD") {
      setOpacity(100);
    } else if (data.type === "hideHUD") {
      setOpacity(0);
    } else if (data.type === "setPosition") {
      console.log(`Received x: ${data.x} and y: ${data.y} from lua`);
      setX(data.x);
      setY(data.y);
    } else if (data.type === "setScale") {
      console.log(`Received scale: ${data.scale} from lua`);
      setScale(data.scale);
    } else if (data.type === "setAnchor") {
      setUseLeftAnchor(data.bool);
    } else if (data.type === "showMenu") {
      setMenuOpacity(100);
    } else if (data.type === "hideMenu") {
      setMenuOpacity(0);
    } else if (data.type === "setHudDisabled") {
      if (data.bool === 1) {
        setHudDisabled(true);
      } else {
        setHudDisabled(false);
      }
    } else if (data.type === "showHelp") {
      setShowHelp(true);
    } else if (data.type === "hideHelp") {
      setShowHelp(false);
    }

    if (data.type === "clearButtons") {
      //console.log("Clearing buttons")
      setButtonObjects([]);
    }

    if (data.type === "populateButtons") {
      //console.log(`Populating buttons ${JSON.stringify(data.buttons)}`)
      setButtonObjects(data.buttons);
      // setTaClassString(calculateTaClassString(data.buttons));
    }

    // takes: extra, state(0 on, 1 off)
    if (data.type === "setButton") {
      //console.log(`Setting button ${data.extra} ${data.newState}`)
      setButton(data.extra, data.newState);
    }

    if (data.type === "setButtons") {
      // console.log(`Setting buttons ${JSON.stringify(data.buttonStates)}`);
      setButtons(data.buttonStates);
    }
  };

  useEffect(() => {
    //console.log("I am the useEffect")

    window.removeEventListener("message", handleMessage);
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  /////////////////
  // DEFINITIONS //
  /////////////////

  let buttons = buttonObjects.map((buttonObject, index) => (
    <>
      <StageButton
        showHelp={showHelp}
        key={index}
        extra={buttonObject.extra}
        numKey={buttonObject.numKey}
        enabled={buttonObject.enabled}
        color={buttonObject.color}
        label={buttonObject.label}
      />
    </>
  ));

  return (
    <>
      {/* MENU */}
      <Menu
        hudDisabled={hudDisabled}
        setHudDisabled={setHudDisabled}
        opacity={menuOpacity}
        setMenuOpacity={setMenuOpacity}
        scale={scale}
        setScale={setScale}
        useLeftAnchor={useLeftAnchor}
        setUseLeftAnchor={setUseLeftAnchor}
        setPosition={setPosition}
      />

      {/* HUD */}
      <Draggable
        defaultPosition={{ x, y }}
        scale={scale}
        position={{ x, y }}
        onStop={(e, data) => {
          handleDragEvent(e, data);
        }}
      >
        <Box
          sx={{
            position: "absolute",
            bottom: 40,
            ...(useLeftAnchor === "true" ? { left: 40 } : { right: 40 }),
            scale: `${scale}`,
            opacity: `${opacity}%`,
            transition: "opacity 0.25s ease",
          }}
        >
          {/* <Button onClick={() => {addButton(1, 1, false, 'green', 'STAGE 2')}}>Add button</Button>
          <Button onClick={() => {setButton(1, true)}}>Turn on</Button>
          <Button onClick={() => {setButtonObjects([])}}>Clear</Button>
          <Button onClick={() => {if (menuOpacity === 100) {setMenuOpacity(0)} else {setMenuOpacity(100)}}}>Menu</Button>
          <Button onClick={() => {setShowHelp(!showHelp)}}>Help</Button> */}
          <div className="background">
            {/* <div className={taClassString}>
              <TaModule on={false}></TaModule>
              <TaModule on={false}></TaModule>
              <TaModule on={true}></TaModule>
              <TaModule on={true}></TaModule>
              <TaModule on={true}></TaModule>
              <TaModule on={true}></TaModule>
              <TaModule on={false}></TaModule>
            </div> */}

            <div className="buttons">{buttons}</div>
          </div>
        </Box>
      </Draggable>
    </>
  );
}

export default App;
