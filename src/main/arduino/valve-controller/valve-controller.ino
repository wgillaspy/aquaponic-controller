#include <ArduinoJson.h>

#define VALVE_OPEN_CLOSE_DELAY 10000
#define WAIT_DELAY 100


#define LED_AND_POWER_INDICATOR           13

#define LED_ONE   A5
#define LED_TWO   A4
#define LED_THREE A3

int LED_VALUE = 130;

// The valves
#define FRESH_WATER_VALVE                 12
#define WASTE_WATER_VALVE                 11
#define FLOW_WATER_VALVE_POLARITY         10
#define FLOW_WATER_VALVE_ON_OFF            9

// The buttons
#define BUTTON_GREEN   A0
#define BUTTON_YELLOW  A1
#define BUTTON_RED     A2

// The float switch inputs
#define FLOAT_SWITCH_LOWER 8
#define FLOAT_SWITCH_UPPER 7


// OLD BELOW / USED ABOVE

boolean flowWaterStatus = true;

boolean waterChange = false;

int loopCount = 0;
int  freshWaterValveState = 0;
int wasteWaterValveState = 0;
int flowValveState = 0;

int floatSwitchLowerValue = 0;
int floatSwitchUpperValue = 0;

boolean override = false;




void setup() {

   Serial.begin(9600);

   pinMode(LED_ONE, OUTPUT);
   pinMode(LED_TWO, OUTPUT);
   pinMode(LED_THREE, OUTPUT);

   analogWrite(LED_ONE, 0);
   analogWrite(LED_TWO, 0);
   analogWrite(LED_THREE, 0);
  
   pinMode(LED_AND_POWER_INDICATOR, OUTPUT);
   digitalWrite(LED_AND_POWER_INDICATOR, HIGH);

   pinMode(FRESH_WATER_VALVE, OUTPUT);
   digitalWrite(FRESH_WATER_VALVE, LOW);

   pinMode(WASTE_WATER_VALVE, OUTPUT);
   digitalWrite(WASTE_WATER_VALVE, LOW);

   pinMode(FLOW_WATER_VALVE_POLARITY, OUTPUT);
   digitalWrite(FLOW_WATER_VALVE_ON_OFF, LOW);

   pinMode(FLOW_WATER_VALVE_ON_OFF, OUTPUT);
   digitalWrite(FLOW_WATER_VALVE_ON_OFF, LOW);

   pinMode(BUTTON_GREEN, INPUT);
   pinMode(BUTTON_YELLOW, INPUT);
   pinMode(BUTTON_RED, INPUT);

   pinMode(FLOAT_SWITCH_LOWER, INPUT);
   pinMode(FLOAT_SWITCH_UPPER, INPUT);

   turnOnFlowValve();
}

void loop() {

  loopCount++;
  delay(WAIT_DELAY);

  if (Serial.available() > 0) {
    // read the incoming byte:
    String incomingJson = Serial.readString();
    readJsonAndDoAction(incomingJson);
    
  }

   floatSwitchLowerValue = digitalRead(FLOAT_SWITCH_LOWER);
   floatSwitchUpperValue = digitalRead(FLOAT_SWITCH_UPPER);
   
   int buttonGreenValue = digitalRead(BUTTON_GREEN);
   int buttonYellowValue = digitalRead(BUTTON_YELLOW);
   int buttonRedValue = digitalRead(BUTTON_RED);

   if (buttonGreenValue > 0) {
     override = false;
     toggleFreshWaterValue(buttonGreenValue);
   } else {
     if (!override) {
      toggleFreshWaterValue(buttonGreenValue);
     }
   }

   if (buttonYellowValue > 0) {
     override = false;
     if (flowWaterStatus) {
       turnOffFlowValve();
     } else {
       turnOnFlowValve();
     }
   }

   if (buttonRedValue > 0) {
     override = false;
     toggleWasteWaterValue(buttonRedValue);
   } else {
    if (!override) {
     toggleWasteWaterValue(buttonRedValue);
    }
   }

   if (loopCount > 10) {
     serialWriteJsonValues();
     loopCount = 0;
  }
}

void indicatorLedOn(int LED) {
  analogWrite(LED, LED_VALUE);
}

void indicatorLedOff(int LED) {
  analogWrite(LED, 0);
}

void readJsonAndDoAction(String inputJson) {
    StaticJsonDocument<400> doc;
    DeserializationError error = deserializeJson(doc, inputJson);
    // Test if parsing succeeds.
    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.c_str());
      return;
    }
    int desiredflowValveState = doc["fvs"];
    int desiredFreshwaterValveState = doc["fws"];
    int desiredWasteWaterValveState = doc["wws"];;



    toggleFreshWaterValue(desiredFreshwaterValveState);
    toggleWasteWaterValue(desiredWasteWaterValveState);

    if (desiredflowValveState > 0) {
      turnOnFlowValve();
    } else {
      turnOffFlowValve();
    }

    override = true;

}

void serialWriteJsonValues() {
      String sendJson = "";

      String floatSwitchLowerJson = getJsonPair("fsl", floatSwitchLowerValue);
      String floatSwitchUpperJson = getJsonPair("fsu", floatSwitchUpperValue);
      String flowValveStateJson = getJsonPair("fvs",   flowValveState);

      String freshWaterValveStateJson = getJsonPair("fws", freshWaterValveState);
      String wasteWaterValveStateJson = getJsonPair("wws", wasteWaterValveState);

      sendJson = addToJsonString(sendJson, floatSwitchLowerJson);
      sendJson = addToJsonString(sendJson, floatSwitchUpperJson);
      sendJson = addToJsonString(sendJson, flowValveStateJson);
      sendJson = addToJsonString(sendJson, freshWaterValveStateJson);
      sendJson = addToJsonString(sendJson, wasteWaterValveStateJson);

      Serial.println(sendJson);
}

void toggleFreshWaterValue(int state) {
    if (state > 0) {
      indicatorLedOn(LED_ONE);
      digitalWrite(FRESH_WATER_VALVE, HIGH);
      
    } else {
      indicatorLedOff(LED_ONE);
      digitalWrite(FRESH_WATER_VALVE, LOW);
    }
    freshWaterValveState = state;
}

void toggleWasteWaterValue(int state) {
    if (state > 0) {
      indicatorLedOn(LED_TWO);
      digitalWrite(WASTE_WATER_VALVE, HIGH);
      
    } else {
      indicatorLedOff(LED_TWO);
      digitalWrite(WASTE_WATER_VALVE, LOW);
    }
    wasteWaterValveState = state;
}


void turnOffFlowValve() {
    indicatorLedOn(LED_THREE);
    digitalWrite(FLOW_WATER_VALVE_ON_OFF, LOW);
    delay(WAIT_DELAY);
    digitalWrite(FLOW_WATER_VALVE_POLARITY, LOW);
    delay(WAIT_DELAY);
    digitalWrite(FLOW_WATER_VALVE_ON_OFF, HIGH);
    delay(VALVE_OPEN_CLOSE_DELAY);
    digitalWrite(FLOW_WATER_VALVE_ON_OFF, LOW);
    flowWaterStatus = false;
    flowValveState = 0;
}

void turnOnFlowValve() {
    indicatorLedOff(LED_THREE);
    digitalWrite(FLOW_WATER_VALVE_ON_OFF, LOW);
    delay(WAIT_DELAY);
    digitalWrite(FLOW_WATER_VALVE_POLARITY, HIGH);
    delay(WAIT_DELAY);
    digitalWrite(FLOW_WATER_VALVE_ON_OFF, HIGH);
    delay(VALVE_OPEN_CLOSE_DELAY);
    digitalWrite(FLOW_WATER_VALVE_ON_OFF, LOW);
    digitalWrite(FLOW_WATER_VALVE_POLARITY, LOW);
    flowWaterStatus = true;
    flowValveState = 1;
}

String addToJsonString(String json, String add_json) {
  if (json.length() == 0) {
     return "{" + add_json + "}";
  } else {
    json.remove(json.length() - 1);
    return json + "," + add_json + "}";
  }
}

String getJsonPair(String name, String value) {
  String json = "\"" + name + "\":\"";
  json.concat(value);
  json.concat("\"");
  return json;
}

String getJsonPair(String name, float value) {
  String json = "\"" + name + "\":\"";
  json.concat(value);
  json.concat("\"");
  return json;
}

String getJsonPair(String name, double value) {
  String json = "\"" + name + "\":\"";
  json.concat(value);
  json.concat("\"");
  return json;
}

String getJsonPair(String name, int value) {
  String json = "\"" + name + "\":";
  json.concat(value);
  return json;
}
