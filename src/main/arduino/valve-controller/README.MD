lsusb -v | grep -i 'Arduino Uno'

SUBSYSTEMS=="usb", ATTRS{serial}=="7583331353335180F132", SYMLINK+="ino"  > /etc/udev/rules.d/99-usb.rules