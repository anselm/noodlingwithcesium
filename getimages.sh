#!/bin/bash

# just get a pile of tiles around this area

lod=18
x=59890
x2=59910
y=154190
y2=154210


for j in `seq $x $x2`;
do
  mkdir -p "images/18/$j"
  for i in `seq $y $y2`;
  do
    wget -O "images/18/$j/$i.png" "https://beta.cesium.com/api/assets/3470/$lod/$j/$i.png?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw"
  done
done

