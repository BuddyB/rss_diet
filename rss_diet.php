<?
  function shouldFilterOut($item) {
    //echo "shouldFilterOut called on: " . $item->title . " path [" . $item->getNodePath();
    foreach ($_GET as $key => $value) {
      if (strpos($key, "filter_") === 0 && $value != null && $value != '') {
        $paramName = substr($key, strlen("filter_"));
        //echo "key: $key paramName: [$paramName] <br>";
        foreach($item->childNodes as $childNode) {
          if ($childNode->nodeName === $paramName) {
            //echo "Checking [" . $childNode->nodeValue . "] for " . $value . "\n";
            $found = stripos($childNode->nodeValue, $value);
            if ($found === false) {
              //echo "NOT FOUND\n";
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  $rssSrc = file_get_contents($_GET['url']);
  if (!$rssSrc) {
    echo "Error reading source RSS: " . $_GET['url'] . "!";
    die(-1);
  }

  $rssXml = new DOMDocument();
  $rssXml->loadXML($rssSrc);

  $nodesToRemove = array();
  $items = $rssXml->getElementsByTagName("item");
  foreach($items as $item) {
    if (shouldFilterOut($item)) {
      $nodesToRemove[] = $item;
    }
  }
  foreach($nodesToRemove as $item) {
    $item->parentNode->removeChild($item);
  }

  echo $rssXml->saveXML();
?>
