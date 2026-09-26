using System.Text.RegularExpressions;
using System.Windows.Controls;
using System.Windows.Input;

namespace LLPlayer.Controls.Settings;

public partial class SettingsVideo : UserControl
{
    public SettingsVideo()
    {
        InitializeComponent();
    }

    private void ValidationRatio(object sender, TextCompositionEventArgs e)
    {
        e.Handled = !RegRatio().IsMatch(e.Text);
    }

    [GeneratedRegex(@"^[0-9\.\,\/\:]+$")]
    private static partial Regex RegRatio();
}
