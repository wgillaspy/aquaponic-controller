lsusb -v | grep -i 'Arduino Uno'

SUBSYSTEMS=="usb", ATTRS{serial}=="7543931373735181D0D2", SYMLINK+="ino"  > /etc/udev/rules.d/99-usb.rules