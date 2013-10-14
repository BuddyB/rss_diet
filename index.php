<html>

<h1>RSS Diet tester</h1>

<?
  if ($_GET['url'] == "") {
    $_GET['url'] = "http://buddybetts.com/rss_feed.xml";
  }
?>

<form method=get>
  URL: <input type=text name=url value="<? echo $_GET['url']; ?>" /><br>
  Title: <input type=text name=filter_title value="<? echo $_GET['filter_title']; ?>" /><br>
  Link: <input type=text name=filter_link value="<? echo $_GET['filter_link']; ?>" /><br>
  Description: <input type=text name=filter_description value="<? echo $_GET['filter_description']; ?>" /><br>
  Author: <input type=text name=filter_author value="<? echo $_GET['filter_author']; ?>" /><br>
  <input type=submit /><br>
</form>

<hr>

<?
  $src = "rss_diet.php?url=" . $_GET['url'] . "&";
  foreach ($_GET as $key => $value) {
    if (strpos($key, "filter_") === 0 && $value != null && $value != '') {
      $src .= $key . '=' . $value . "&";
    }
  }
  $src = substr($src, 0, -1);
  echo "Showing: $src...<br>";
  echo "<iframe src=$src width='100%' />";
?>

</html>
